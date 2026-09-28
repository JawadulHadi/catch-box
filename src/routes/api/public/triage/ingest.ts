import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import type { Json } from "@/integrations/supabase/types";


const payloadSchema = z.object({
  url: z.string().url().max(2000),
  site: z.string().min(1).max(200).optional(),
  reason: z.enum(["page_changed", "blocked", "missing_info", "other"]).optional(),
  got: z.record(z.unknown()).optional(),
  missing: z.array(z.string().max(120)).max(50).optional(),
  error: z.string().max(8000).optional(),
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/public/triage/ingest")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const ingestKey = request.headers.get("x-ingest-key");
        if (!ingestKey) return json({ error: "Missing x-ingest-key header" }, 401);

        const parsed = payloadSchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) {
          return json({ error: "Invalid payload", details: parsed.error.flatten() }, 400);
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Resolve the owner from the key itself — never from the caller's body.
        const { data: keyRow, error: keyError } = await supabaseAdmin
          .from("ingest_keys")
          .select("owner_id")
          .eq("key", ingestKey)
          .maybeSingle();

        if (keyError) return json({ error: "Could not verify that key" }, 500);
        if (!keyRow) return json({ error: "That key is not valid" }, 401);

        const body = parsed.data;
        const site = body.site ?? new URL(body.url).host;

        const { data: inserted, error: insertError } = await supabaseAdmin
          .from("human_triage_queue")
          .insert({
            owner_id: keyRow.owner_id,
            site,
            url: body.url,
            error_type: body.reason ?? "other",
            error_trace: body.error ?? null,
            raw_payload: (body.got ?? {}) as Json,
            missing_fields: body.missing ?? [],
          })
          .select("id")
          .single();

        if (insertError) return json({ error: "Could not save that catch" }, 500);

        const { data: job } = await supabaseAdmin
          .from("scraper_jobs")
          .select("id, failure_count")
          .eq("owner_id", keyRow.owner_id)
          .eq("site", site)
          .maybeSingle();

        if (job) {
          await supabaseAdmin
            .from("scraper_jobs")
            .update({
              failure_count: job.failure_count + 1,
              last_failure_at: new Date().toISOString(),
            })
            .eq("id", job.id);
        } else {
          await supabaseAdmin.from("scraper_jobs").insert({
            owner_id: keyRow.owner_id,
            site,
            failure_count: 1,
            last_failure_at: new Date().toISOString(),
          });
        }

        return json({ ok: true, id: inserted.id }, 201);
      },
    },
  },
});
