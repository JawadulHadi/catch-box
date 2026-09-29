import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export type CatchReason = "page_changed" | "blocked" | "missing_info" | "other";
export type CatchStatus = "pending" | "resolved" | "discarded";

export type CatchItem = {
  id: string;
  site: string;
  url: string;
  error_type: CatchReason;
  error_trace: string | null;
  raw_payload: Record<string, unknown>;
  missing_fields: string[];
  status: CatchStatus;
  created_at: string;
  resolved_at: string | null;
};

export type ApprovedRecord = {
  id: string;
  site: string;
  url: string;
  data: Record<string, unknown>;
  extracted_at: string;
};

export type ScraperRow = {
  id: string;
  site: string;
  schedule: string;
  failure_count: number;
  last_failure_at: string | null;
};

/** Plain-English label for why a scrape needs a look. */
export const reasonLabels: Record<CatchReason, string> = {
  page_changed: "The page changed",
  blocked: "Blocked by the site",
  missing_info: "Information was missing",
  other: "Something else went wrong",
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export async function seedExamples(): Promise<void> {
  const { error } = await supabase.rpc("seed_demo_data");
  if (error) throw new Error(error.message);
}

export async function fetchCatches(status: CatchStatus = "pending"): Promise<CatchItem[]> {
  const { data, error } = await supabase
    .from("human_triage_queue")
    .select(
      "id, site, url, error_type, error_trace, raw_payload, missing_fields, status, created_at, resolved_at",
    )
    .eq("status", status)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map(
    (row) => ({ ...row, raw_payload: asRecord(row.raw_payload) }) as CatchItem,
  );
}

export async function fetchCatch(id: string): Promise<CatchItem | null> {
  const { data, error } = await supabase
    .from("human_triage_queue")
    .select(
      "id, site, url, error_type, error_trace, raw_payload, missing_fields, status, created_at, resolved_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return { ...data, raw_payload: asRecord(data.raw_payload) } as CatchItem;
}

export async function approveCatch(id: string, values: Record<string, unknown>): Promise<void> {
  const { error } = await supabase.rpc("promote_triage_record", {
    p_record_id: id,
    p_data: values as Json,
  });
  if (error) throw new Error(error.message);
}

export async function discardCatch(id: string): Promise<void> {
  const { error } = await supabase
    .from("human_triage_queue")
    .update({ status: "discarded", resolved_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function fetchApproved(): Promise<ApprovedRecord[]> {
  const { data, error } = await supabase
    .from("scraped_warehouse")
    .select("id, site, url, data, extracted_at")
    .order("extracted_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({ ...row, data: asRecord(row.data) }) as ApprovedRecord);
}

export async function fetchScrapers(): Promise<ScraperRow[]> {
  const { data, error } = await supabase
    .from("scraper_jobs")
    .select("id, site, schedule, failure_count, last_failure_at")
    .order("failure_count", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchIngestKey(): Promise<string> {
  const { data, error } = await supabase.rpc("ensure_ingest_key", { p_rotate: false });
  if (error) throw new Error(error.message);
  return data as string;
}

export async function rotateIngestKey(): Promise<string> {
  const { data, error } = await supabase.rpc("ensure_ingest_key", { p_rotate: true });
  if (error) throw new Error(error.message);
  return data as string;
}

export async function countPendingCatches(): Promise<number> {
  const { count, error } = await supabase
    .from("human_triage_queue")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export type ScraperAlert = {
  id: string;
  site: string;
  failures_in_window: number;
  created_at: string;
};

/** Sites that failed 3+ times in the last 24 hours. */
export async function fetchRecentAlerts(): Promise<ScraperAlert[]> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("scraper_alerts")
    .select("id, site, failures_in_window, created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export type ScraperStatus = {
  site: string;
  lastRunAt: string | null;
  lastSuccessAt: string | null;
  failureCount: number;
  approvedCount: number;
};

/** Per-site live status: last run and how many approved records (which the sheet mirrors). */
export async function fetchScraperStatus(): Promise<{
  sites: ScraperStatus[];
  sheetSyncedAt: string | null;
  sheetUrl: string | null;
}> {
  const [jobs, approved, sheet] = await Promise.all([
    supabase
      .from("scraper_jobs")
      .select("site, last_run_at, last_success_at, last_failure_at, failure_count"),
    supabase.from("scraped_warehouse").select("site, extracted_at"),
    supabase.from("sheet_exports").select("last_synced_at, spreadsheet_url").maybeSingle(),
  ]);
  if (jobs.error) throw new Error(jobs.error.message);
  if (approved.error) throw new Error(approved.error.message);
  const counts = new Map<string, { n: number; latest: string | null }>();
  for (const row of approved.data ?? []) {
    const c = counts.get(row.site) ?? { n: 0, latest: null };
    c.n += 1;
    if (!c.latest || row.extracted_at > c.latest) c.latest = row.extracted_at;
    counts.set(row.site, c);
  }
  const sites = (jobs.data ?? []).map((job) => {
    const c = counts.get(job.site);
    const candidates = [job.last_run_at, job.last_failure_at, c?.latest ?? null]
      .filter((v): v is string => !!v)
      .sort();
    return {
      site: job.site,
      lastRunAt: candidates.at(-1) ?? null,
      lastSuccessAt: job.last_success_at ?? c?.latest ?? null,
      failureCount: job.failure_count,
      approvedCount: c?.n ?? 0,
    };
  });
  sites.sort((a, b) => (b.lastRunAt ?? "").localeCompare(a.lastRunAt ?? ""));
  return {
    sites,
    sheetSyncedAt: sheet.data?.last_synced_at ?? null,
    sheetUrl: sheet.data?.spreadsheet_url ?? null,
  };
}

export type Recipe = {
  id: string;
  site: string;
  start_url: string;
  fields: { name: string; selector: string; attr?: string }[];
  last_run_at: string | null;
  last_result: string | null;
};

export async function fetchRecipes(): Promise<Recipe[]> {
  const { data, error } = await supabase
    .from("scraper_recipes")
    .select("id, site, start_url, fields, last_run_at, last_result")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    ...row,
    fields: Array.isArray(row.fields) ? (row.fields as Recipe["fields"]) : [],
  }));
}

export async function deleteRecipe(id: string): Promise<void> {
  const { error } = await supabase.from("scraper_recipes").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export type RunPoint = { ranAt: string; outcome: "approved" | "caught"; durationMs: number | null };

export type ScraperHistory = {
  site: string;
  runs: RunPoint[];
  totalRuns: number;
  successRate: number | null;
  avgDurationMs: number | null;
  approvedCount: number;
};

/** Run history per site over the last 30 days, plus approved records (which the sheet mirrors). */
export async function fetchScraperHistory(): Promise<ScraperHistory[]> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const [runs, approved] = await Promise.all([
    supabase
      .from("scraper_runs")
      .select("site, outcome, duration_ms, ran_at")
      .gte("ran_at", since)
      .order("ran_at", { ascending: true }),
    supabase.from("scraped_warehouse").select("site"),
  ]);
  if (runs.error) throw new Error(runs.error.message);
  if (approved.error) throw new Error(approved.error.message);

  const approvedBySite = new Map<string, number>();
  for (const row of approved.data ?? [])
    approvedBySite.set(row.site, (approvedBySite.get(row.site) ?? 0) + 1);

  const bySite = new Map<string, RunPoint[]>();
  for (const row of runs.data ?? []) {
    const list = bySite.get(row.site) ?? [];
    list.push({
      ranAt: row.ran_at,
      outcome: row.outcome === "approved" ? "approved" : "caught",
      durationMs: row.duration_ms,
    });
    bySite.set(row.site, list);
  }
  const sites = new Set([...bySite.keys(), ...approvedBySite.keys()]);

  return [...sites]
    .map((site) => {
      const list = bySite.get(site) ?? [];
      const ok = list.filter((r) => r.outcome === "approved").length;
      const timed = list.filter(
        (r): r is RunPoint & { durationMs: number } => r.durationMs !== null,
      );
      return {
        site,
        runs: list,
        totalRuns: list.length,
        successRate: list.length ? ok / list.length : null,
        avgDurationMs: timed.length
          ? timed.reduce((s, r) => s + r.durationMs, 0) / timed.length
          : null,
        approvedCount: approvedBySite.get(site) ?? 0,
      };
    })
    .sort((a, b) => b.totalRuns - a.totalRuns);
}
