import type { createSupabaseServerClient } from "@/integrations/supabase/client.server";
import { accessToken, googleSheetsConfigured, ReconnectRequiredError } from "./google.server";

type SupabaseServer = ReturnType<typeof createSupabaseServerClient>;

const TAB = "Approved data";
const SHEETS_API = "https://sheets.googleapis.com/v4/spreadsheets";

export type SyncResult =
  | { status: "synced"; rows: number }
  | { status: "not_connected" }
  | { status: "reconnect_required" };

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

async function recordResult(supabase: SupabaseServer, userId: string, error: string | null) {
  await supabase
    .from("sheet_exports")
    .update({
      last_error: error,
      ...(error ? {} : { last_synced_at: new Date().toISOString() }),
    })
    .eq("owner_id", userId);
}

async function createSheet(supabase: SupabaseServer, userId: string, token: string) {
  const response = await fetch(SHEETS_API, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      properties: { title: "Catchbox — approved data" },
      sheets: [{ properties: { title: TAB } }],
    }),
  });
  if (!response.ok) throw new Error(`Couldn't create your sheet [${response.status}]`);
  const created = (await response.json()) as { spreadsheetId: string; spreadsheetUrl: string };
  const { error } = await supabase.from("sheet_exports").upsert({
    owner_id: userId,
    spreadsheet_id: created.spreadsheetId,
    spreadsheet_url: created.spreadsheetUrl,
    last_error: null,
  });
  if (error) throw new Error("Couldn't remember your sheet.");
  return created.spreadsheetId;
}

/**
 * Creates the person's sheet if needed, then rewrites it with all their approved data.
 * Runs as the signed-in person, so it can only ever read and write their own rows.
 */
export async function syncSheetForUser(
  supabase: SupabaseServer,
  userId: string,
): Promise<SyncResult> {
  if (!googleSheetsConfigured()) return { status: "not_connected" };

  let token: string | null;
  try {
    token = await accessToken(supabase, userId);
  } catch (error) {
    if (error instanceof ReconnectRequiredError) {
      await recordResult(supabase, userId, "Google access was removed. Connect again.");
      return { status: "reconnect_required" };
    }
    throw error;
  }
  if (!token) return { status: "not_connected" };

  const { data: rows, error } = await supabase
    .from("scraped_warehouse")
    .select("site, url, data, extracted_at")
    .order("extracted_at", { ascending: false });
  if (error) throw error;

  const columns = [
    ...new Set(
      (rows ?? []).flatMap((row) =>
        row.data && typeof row.data === "object" && !Array.isArray(row.data)
          ? Object.keys(row.data)
          : [],
      ),
    ),
  ];
  const values: string[][] = [["Site", "Page", "Approved on", ...columns]];
  for (const row of rows ?? []) {
    const data = (
      row.data && typeof row.data === "object" && !Array.isArray(row.data) ? row.data : {}
    ) as Record<string, unknown>;
    values.push([
      row.site,
      row.url,
      formatDate(row.extracted_at),
      ...columns.map((c) => (data[c] === null || data[c] === undefined ? "" : String(data[c]))),
    ]);
  }

  const { data: sheet } = await supabase
    .from("sheet_exports")
    .select("spreadsheet_id")
    .eq("owner_id", userId)
    .maybeSingle();
  let spreadsheetId = sheet?.spreadsheet_id ?? (await createSheet(supabase, userId, token));

  const range = encodeURIComponent(`'${TAB}'`);
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  let clear = await fetch(`${SHEETS_API}/${spreadsheetId}/values/${range}:clear`, {
    method: "POST",
    headers,
    body: "{}",
  });
  if (clear.status === 404) {
    // The sheet was deleted in Google Drive: make a new one.
    spreadsheetId = await createSheet(supabase, userId, token);
    clear = await fetch(`${SHEETS_API}/${spreadsheetId}/values/${range}:clear`, {
      method: "POST",
      headers,
      body: "{}",
    });
  }
  if (!clear.ok) {
    const message = `Couldn't update your sheet [${clear.status}]`;
    await recordResult(supabase, userId, message);
    throw new Error(message);
  }

  // RAW: values are written as text, so nothing scraped can run as a formula.
  const write = await fetch(
    `${SHEETS_API}/${spreadsheetId}/values/${encodeURIComponent(`'${TAB}'!A1`)}?valueInputOption=RAW`,
    { method: "PUT", headers, body: JSON.stringify({ values }) },
  );
  if (!write.ok) {
    const message = `Couldn't update your sheet [${write.status}]`;
    await recordResult(supabase, userId, message);
    throw new Error(message);
  }
  await recordResult(supabase, userId, null);
  return { status: "synced", rows: values.length - 1 };
}
