import { supabase } from "@/integrations/supabase/client";

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
    .select("id, site, url, error_type, error_trace, raw_payload, missing_fields, status, created_at, resolved_at")
    .eq("status", status)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({ ...row, raw_payload: asRecord(row.raw_payload) }) as CatchItem);
}

export async function fetchCatch(id: string): Promise<CatchItem | null> {
  const { data, error } = await supabase
    .from("human_triage_queue")
    .select("id, site, url, error_type, error_trace, raw_payload, missing_fields, status, created_at, resolved_at")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return { ...data, raw_payload: asRecord(data.raw_payload) } as CatchItem;
}

export async function approveCatch(id: string, values: Record<string, unknown>): Promise<void> {
  const { error } = await supabase.rpc("promote_triage_record", {
    p_record_id: id,
    p_data: values,
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
