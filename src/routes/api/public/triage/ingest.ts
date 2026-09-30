import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { isSupabaseConfigured } from "@/integrations/supabase/env";
import type { Json } from "@/integrations/supabase/types";

const payloadSchema = z.object({
  url: z
    .string()
    .url()
    .max(2000)
    .regex(/^https?:\/\//i, "Use an http(s) address"),
  site: z.string().min(1).max(200).optional(),
  reason: z.enum(["page_changed", "blocked", "missing_info", "other"]).optional(),
  got: z.record(z.unknown()).optional(),
  missing: z.array(z.string().max(120)).max(50).optional(),
  error: z.string().max(8000).optional(),
});

// Generous for a page's worth of captured fields; stops someone streaming megabytes at the key.
const MAX_BODY_BYTES = 256 * 1024;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function ingest(request: Request): Promise<Response> {
  const ingestKey = request.headers.get("x-ingest-key");
  if (!ingestKey) return json({ error: "Missing x-ingest-key header" }, 401);

  const text = await request.text();
  if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) {
    return json({ error: `Payload is larger than ${MAX_BODY_BYTES / 1024} KB` }, 413);
  }
  let payload: unknown = null;
  try {
    payload = JSON.parse(text);
  } catch {
    // Falls through to the schema check, which reports it as an invalid payload.
  }
  const parsed = payloadSchema.safeParse(payload);
  if (!parsed.success) {
    return json({ error: "Invalid payload", details: parsed.error.flatten() }, 400);
  }

  if (!isSupabaseConfigured()) {
    return json({ error: "This Catchbox isn't connected to its database yet" }, 503);
  }
  const { createSupabaseAnonClient } = await import("@/integrations/supabase/client.server");

  const body = parsed.data;
  // ingest_catch() works out the owner from the key's hash alone — never from the body —
  // and returns null for a key that isn't valid.
  const { data: id, error } = await createSupabaseAnonClient().rpc("ingest_catch", {
    p_key: ingestKey,
    p_url: body.url,
    p_site: body.site ?? new URL(body.url).host,
    p_reason: body.reason ?? "other",
    p_got: (body.got ?? {}) as Json,
    p_missing: body.missing ?? [],
    ...(body.error ? { p_error: body.error } : {}),
  });

  if (error) return json({ error: "Could not save that catch" }, 500);
  if (!id) return json({ error: "That key is not valid" }, 401);

  return json({ ok: true, id }, 201);
}

export const Route = createFileRoute("/api/public/triage/ingest")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          return await ingest(request);
        } catch (error) {
          // Scrapers read JSON; never hand them the HTML error page.
          console.error(error);
          return json({ error: "Catchbox couldn't save that catch. Try again in a minute." }, 500);
        }
      },
    },
  },
});
