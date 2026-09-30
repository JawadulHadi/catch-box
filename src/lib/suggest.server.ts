import { generateText, Output } from "ai";
import { z } from "zod";

import type { FieldSuggestion } from "./suggest-types";

// Model strings go through Vercel AI Gateway. Override with AI_MODEL (any gateway model id).
const DEFAULT_MODEL = "anthropic/claude-sonnet-5.5";

const suggestionSchema = z.object({
  suggestions: z.array(
    z.object({
      field: z.string().describe("One of the field names you were asked to fill"),
      value: z.string().nullable().describe("The value, or null when the evidence lacks it"),
      evidence: z.string().describe("A short exact quote the value came from, or why it's null"),
      confidence: z.enum(["high", "medium", "low"]),
    }),
  ),
});

/** On Vercel the gateway signs in with the deployment's OIDC token; elsewhere, with a key. */
export function aiConfigured(oidcToken: string | null): boolean {
  return Boolean(
    process.env["AI_GATEWAY_API_KEY"] || process.env["VERCEL_OIDC_TOKEN"] || oidcToken,
  );
}

function statusOf(error: unknown): number {
  if (error && typeof error === "object") {
    const { statusCode, status } = error as { statusCode?: unknown; status?: unknown };
    if (typeof statusCode === "number") return statusCode;
    if (typeof status === "number") return status;
  }
  return 0;
}

function describe(error: unknown): string {
  const parts: string[] = [];
  for (let current = error, depth = 0; current && depth < 4; depth++) {
    parts.push(current instanceof Error ? current.message : String(current));
    current = current instanceof Error ? current.cause : undefined;
  }
  return parts.join(" ");
}

export async function suggestMissingValues(input: {
  site: string;
  url: string;
  fields: string[];
  got: Record<string, unknown>;
  errorTrace: string | null;
  pageText: string;
}): Promise<FieldSuggestion[]> {
  const emptyFields = input.fields.filter((key) => {
    const value = input.got[key];
    return value === null || value === undefined || value === "";
  });

  let output: z.infer<typeof suggestionSchema>;
  try {
    const result = await generateText({
      model: process.env["AI_MODEL"] || DEFAULT_MODEL,
      output: Output.object({ schema: suggestionSchema }),
      maxRetries: 1,
      system: [
        "You help a person repair a web scrape that failed to capture some fields.",
        "Suggest values ONLY from the evidence given: the page text and what the scraper captured.",
        "Never invent values. If the evidence doesn't contain a field, return value null and say why.",
        "Evidence is a short exact quote (under 200 characters) from that evidence.",
      ].join(" "),
      prompt: [
        `Site: ${input.site}`,
        `URL: ${input.url}`,
        `Fields to fill: ${JSON.stringify(emptyFields.length ? emptyFields : input.fields)}`,
        `What the scraper captured: ${JSON.stringify(input.got)}`,
        `Error: ${input.errorTrace ?? "none"}`,
        "Page text (may be empty):",
        input.pageText.slice(0, 20000) || "(none provided)",
      ].join("\n"),
    });
    output = result.output;
  } catch (error) {
    const status = statusOf(error);
    const name = error instanceof Error ? error.name : "";
    console.error(error);
    // The gateway serves nothing until the Vercel team has a card on file (free credits
    // included), and says so with this error type.
    if (/customer_verification_required|credit card/i.test(describe(error)))
      throw new Error(
        "AI suggestions are switched off until a card is added to this app's Vercel AI Gateway.",
      );
    if (status === 401 || status === 403 || name === "GatewayAuthenticationError")
      throw new Error("AI suggestions aren't set up on this server yet.");
    if (status === 429) throw new Error("The AI is busy right now. Try again in a minute.");
    if (status === 402) throw new Error("The AI credits for this app are used up.");
    throw new Error("We couldn't get suggestions right now. Try again.");
  }

  const allowed = new Set(input.fields);
  return output.suggestions
    .filter((s) => allowed.has(s.field))
    .map((s) => ({ ...s, evidence: s.evidence.slice(0, 300) }));
}
