import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { aiConfigured, suggestMissingValues } from "./suggest.server";

export const suggestFieldValues = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ id: z.string().uuid(), pageText: z.string().max(50000) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    // Vercel passes each function call its OIDC token; the AI Gateway accepts it in
    // place of an API key, so production needs no AI secret at all.
    const oidcToken = getRequest().headers.get("x-vercel-oidc-token");
    if (oidcToken && !process.env["AI_GATEWAY_API_KEY"]) {
      process.env["VERCEL_OIDC_TOKEN"] = oidcToken;
    }
    if (!aiConfigured(oidcToken))
      throw new Error("AI suggestions aren't set up on this server yet.");

    // RLS limits this read to the reviewer's own catches.
    const { data: row, error } = await context.supabase
      .from("human_triage_queue")
      .select("site, url, raw_payload, missing_fields, error_trace")
      .eq("id", data.id)
      .maybeSingle();
    if (error || !row) throw new Error("We couldn't find that item.");

    const got =
      row.raw_payload && typeof row.raw_payload === "object" && !Array.isArray(row.raw_payload)
        ? (row.raw_payload as Record<string, unknown>)
        : {};
    const fields = [...new Set([...Object.keys(got), ...row.missing_fields])];

    const suggestions = await suggestMissingValues({
      site: row.site,
      url: row.url,
      fields,
      got,
      errorTrace: row.error_trace,
      pageText: data.pageText,
    });
    return { suggestions };
  });
