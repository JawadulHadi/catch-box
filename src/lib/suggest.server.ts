import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import { z } from "zod";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1";
const MODEL = "openai/gpt-6-astra";
const RUN_ID_HEADER = "X-Lovable-AIG-Run-ID";

export type FieldSuggestion = {
  field: string;
  value: string | null;
  evidence: string;
  confidence: "high" | "medium" | "low";
};

const suggestionSchema = z.object({
  suggestions: z.array(
    z.object({
      field: z.string(),
      value: z.string().nullable(),
      evidence: z.string(),
      confidence: z.enum(["high", "medium", "low"]).catch("low"),
    }),
  ),
});

/** Creates a fetch that reuses the gateway-issued run id across calls in one request. */
function runIdFetch() {
  let runId: string | undefined;
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    if (runId) headers.set(RUN_ID_HEADER, runId);
    const response = await fetch(input, { ...init, headers });
    runId ??= response.headers.get(RUN_ID_HEADER)?.trim() || undefined;
    return response;
  };
}

function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("The AI reply had no suggestions in it.");
  return JSON.parse(text.slice(start, end + 1));
}

export async function suggestMissingValues(input: {
  site: string;
  url: string;
  fields: string[];
  got: Record<string, unknown>;
  errorTrace: string | null;
  pageText: string;
}): Promise<FieldSuggestion[]> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("Lovable AI isn't set up for this app yet.");

  const provider = createOpenAI({
    baseURL: GATEWAY_URL,
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runIdFetch(),
  });

  const emptyFields = input.fields.filter((key) => {
    const value = input.got[key];
    return value === null || value === undefined || value === "";
  });

  const prompt = [
    "A web scraper failed to capture some fields. Suggest values ONLY from the evidence given.",
    "Never invent values. If the evidence does not contain a field, return value null and explain why.",
    "Evidence must be a short exact quote (under 200 characters) from the page text or the captured data.",
    `Site: ${input.site}`,
    `URL: ${input.url}`,
    `Fields to fill: ${JSON.stringify(emptyFields.length ? emptyFields : input.fields)}`,
    `What the scraper captured: ${JSON.stringify(input.got)}`,
    `Error: ${input.errorTrace ?? "none"}`,
    "Page text (may be empty):",
    input.pageText.slice(0, 20000) || "(none provided)",
    'Reply with JSON only: {"suggestions":[{"field":string,"value":string|null,"evidence":string,"confidence":"high"|"medium"|"low"}]}',
  ].join("\n");

  const result = streamText({
    model: provider.responses(MODEL),
    prompt,
    maxRetries: 0,
    providerOptions: {
      openai: {
        forceReasoning: true,
        reasoningEffort: "low",
        reasoningSummary: "auto",
        store: false,
        include: ["reasoning.encrypted_content"],
      },
    },
  });

  let text: string;
  try {
    text = await result.text;
  } catch (error) {
    const status =
      error && typeof error === "object" && "statusCode" in error ? Number(error.statusCode) : 0;
    if (status === 429) throw new Error("Lovable AI is busy right now. Please try again in a minute.");
    if (status === 402 || status === 403)
      throw new Error("Lovable AI credits are used up. Add credits in Settings → Plans & credits.");
    throw new Error("We couldn't get suggestions right now. Please try again.");
  }

  const parsed = suggestionSchema.safeParse(extractJson(text));
  if (!parsed.success) throw new Error("The AI reply didn't make sense. Please try again.");

  const allowed = new Set(input.fields);
  return parsed.data.suggestions
    .filter((s) => allowed.has(s.field))
    .map((s) => ({ ...s, evidence: s.evidence.slice(0, 300) }));
}
