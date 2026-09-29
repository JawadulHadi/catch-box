import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { parse } from "node-html-parser";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Json } from "@/integrations/supabase/types";
import { syncSheetForUser } from "./sheets.server";

const fieldSchema = z.object({
  name: z.string().trim().min(1).max(60),
  selector: z.string().trim().min(1).max(300),
  attr: z.string().trim().max(40).optional(),
});

export type RecipeField = z.infer<typeof fieldSchema>;

const recipeSchema = z.object({
  site: z.string().trim().min(1).max(100),
  startUrl: z.string().trim().url().max(2000),
  fields: z.array(fieldSchema).min(1).max(30),
});

/** Blocks obvious private or local addresses so recipes can only read public web pages. */
function isPublicUrl(raw: string): boolean {
  const url = new URL(raw);
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  const host = url.hostname.toLowerCase();
  return !(
    host === "localhost" ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    /^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    host.includes(":")
  );
}

export const saveRecipe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    recipeSchema.extend({ id: z.string().uuid().optional() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    if (!isPublicUrl(data.startUrl))
      throw new Error("Please use a public web address that starts with http or https.");
    const row = {
      site: data.site,
      start_url: data.startUrl,
      fields: data.fields as unknown as Json,
    };
    const query = data.id
      ? context.supabase.from("scraper_recipes").update(row).eq("id", data.id).select("id").single()
      : context.supabase.from("scraper_recipes").insert(row).select("id").single();
    const { data: saved, error } = await query;
    if (error) throw new Error("We couldn't save that scraper. Please try again.");
    await context.supabase
      .from("scraper_jobs")
      .upsert(
        { site: data.site, owner_id: context.userId },
        { onConflict: "owner_id,site", ignoreDuplicates: true },
      );
    return { id: saved.id };
  });

export type RunResult = { outcome: "approved" | "caught"; message: string; catchId?: string };

export const runRecipe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }): Promise<RunResult> => {
    const { data: recipe, error } = await context.supabase
      .from("scraper_recipes")
      .select("id, site, start_url, fields")
      .eq("id", data.id)
      .maybeSingle();
    if (error || !recipe) throw new Error("We couldn't find that scraper.");
    const fields = z.array(fieldSchema).parse(recipe.fields);
    const now = new Date().toISOString();
    const startedAt = Date.now();
    const logRun = (outcome: "approved" | "caught") =>
      context.supabase.from("scraper_runs").insert({
        owner_id: context.userId,
        site: recipe.site,
        outcome,
        duration_ms: Date.now() - startedAt,
      });

    const got: Record<string, string | null> = {};
    let reason: "blocked" | "page_changed" | "missing_info" | null = null;
    let trace: string | null = null;

    try {
      if (!isPublicUrl(recipe.start_url)) throw new Error("That address isn't a public web page.");
      const response = await fetch(recipe.start_url, {
        headers: { "User-Agent": "CatchboxBot/1.0 (+https://catchbox.app)" },
        signal: AbortSignal.timeout(15000),
      });
      if (response.status === 403 || response.status === 429 || response.status === 503) {
        reason = "blocked";
        trace = `The site answered with ${response.status} — it probably blocked the visit.`;
      } else if (!response.ok) {
        reason = "page_changed";
        trace = `The page answered with ${response.status}.`;
      } else {
        const root = parse(await response.text());
        for (const field of fields) {
          const node = root.querySelector(field.selector);
          const value = node
            ? field.attr
              ? (node.getAttribute(field.attr) ?? null)
              : node.text.trim() || null
            : null;
          got[field.name] = value;
        }
      }
    } catch (err) {
      reason = "blocked";
      trace = err instanceof Error ? err.message : "We couldn't open the page.";
    }

    const missing = fields.map((f) => f.name).filter((name) => !got[name]);
    if (!reason && missing.length === fields.length) {
      reason = "page_changed";
      trace = "None of the fields were found — the page layout may have changed.";
    } else if (!reason && missing.length > 0) {
      reason = "missing_info";
      trace = `Couldn't find: ${missing.join(", ")}.`;
    }

    if (!reason) {
      const { error: saveError } = await context.supabase
        .from("scraped_warehouse")
        .upsert(
          { owner_id: context.userId, site: recipe.site, url: recipe.start_url, data: got as Json },
          { onConflict: "owner_id,url" },
        );
      if (saveError)
        throw new Error("The scrape worked, but we couldn't save it. Please try again.");
      await context.supabase
        .from("scraper_jobs")
        .update({ last_run_at: now, last_success_at: now })
        .eq("owner_id", context.userId)
        .eq("site", recipe.site);
      await context.supabase
        .from("scraper_recipes")
        .update({ last_run_at: now, last_result: "approved" })
        .eq("id", recipe.id);
      await logRun("approved");
      await syncSheetForUser(context.userId).catch(() => null);
      return {
        outcome: "approved",
        message: "Every field was found, so it went straight to Approved data.",
      };
    }

    const { data: caught, error: catchError } = await context.supabase
      .from("human_triage_queue")
      .insert({
        owner_id: context.userId,
        site: recipe.site,
        url: recipe.start_url,
        error_type: reason,
        error_trace: trace,
        raw_payload: got as Json,
        missing_fields: missing,
      })
      .select("id")
      .single();
    if (catchError) throw new Error("We couldn't add this to your inbox. Please try again.");
    const { data: job } = await context.supabase
      .from("scraper_jobs")
      .select("failure_count")
      .eq("owner_id", context.userId)
      .eq("site", recipe.site)
      .maybeSingle();
    await context.supabase
      .from("scraper_jobs")
      .update({
        last_run_at: now,
        last_failure_at: now,
        failure_count: (job?.failure_count ?? 0) + 1,
      })
      .eq("owner_id", context.userId)
      .eq("site", recipe.site);
    await context.supabase
      .from("scraper_recipes")
      .update({ last_run_at: now, last_result: "caught" })
      .eq("id", recipe.id);
    await logRun("caught");
    return {
      outcome: "caught",
      message: trace ?? "Something needs a quick look.",
      catchId: caught.id,
    };
  });
