import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { suggestMissingValues } from "./suggest.server";

export const suggestFieldValues = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ id: z.string().uuid(), pageText: z.string().max(50000) }).parse(data),
  )
  .handler(async ({ data, context }) => {
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
