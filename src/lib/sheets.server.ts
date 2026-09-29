import { appUserReconnectRequired, callAsAppUser } from "@/integrations/lovable/appUserConnector";
import { getConnectionKeyForUser } from "./app-user-connections.server";

export const GATEWAY_BASE_URL = "https://connector-gateway.lovable.dev";
export const SHEETS_CONNECTOR = "google_sheets";
export const SHEETS_SCOPES = [
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/spreadsheets",
];
const TAB = "Approved data";

export type SyncResult =
  | { status: "synced"; rows: number }
  | { status: "not_connected" }
  | { status: "reconnect_required" };

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

async function sheetsCall(key: string, path: string, init?: RequestInit) {
  return callAsAppUser({
    gatewayBaseUrl: GATEWAY_BASE_URL,
    connectionAPIKey: key,
    connectorId: SHEETS_CONNECTOR,
    path,
    requiredScopes: SHEETS_SCOPES,
    init: { ...init, headers: { "Content-Type": "application/json", ...init?.headers } },
  });
}

async function recordError(userId: string, message: string | null, synced: boolean) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin
    .from("sheet_exports")
    .update({
      last_error: message,
      ...(synced ? { last_synced_at: new Date().toISOString() } : {}),
    })
    .eq("owner_id", userId);
}

/** Creates the user's sheet if needed, then rewrites it with all approved data. */
export async function syncSheetForUser(userId: string): Promise<SyncResult> {
  const key = await getConnectionKeyForUser(userId, SHEETS_CONNECTOR);
  if (!key) return { status: "not_connected" };
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  let { data: sheet } = await supabaseAdmin
    .from("sheet_exports")
    .select("spreadsheet_id")
    .eq("owner_id", userId)
    .maybeSingle();

  if (!sheet) {
    const res = await sheetsCall(key, "/v4/spreadsheets", {
      method: "POST",
      body: JSON.stringify({
        properties: { title: "Catchbox — approved data" },
        sheets: [{ properties: { title: TAB } }],
      }),
    });
    if (await appUserReconnectRequired(res)) return { status: "reconnect_required" };
    if (!res.ok) throw new Error(`Couldn't create your sheet [${res.status}]: ${await res.text()}`);
    const created = (await res.json()) as { spreadsheetId: string; spreadsheetUrl: string };
    const { error } = await supabaseAdmin.from("sheet_exports").upsert({
      owner_id: userId,
      spreadsheet_id: created.spreadsheetId,
      spreadsheet_url: created.spreadsheetUrl,
    });
    if (error) throw error;
    sheet = { spreadsheet_id: created.spreadsheetId };
  }

  const { data: rows, error } = await supabaseAdmin
    .from("scraped_warehouse")
    .select("site, url, data, extracted_at")
    .eq("owner_id", userId)
    .order("extracted_at", { ascending: false });
  if (error) throw error;

  const dataKeys = new Set<string>();
  for (const row of rows ?? []) {
    if (row.data && typeof row.data === "object" && !Array.isArray(row.data))
      for (const k of Object.keys(row.data)) dataKeys.add(k);
  }
  const columns = [...dataKeys];
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

  const range = `'${TAB}'`;
  const clear = await sheetsCall(
    key,
    `/v4/spreadsheets/${sheet.spreadsheet_id}/values/${range}:clear`,
    {
      method: "POST",
      body: "{}",
    },
  );
  if (await appUserReconnectRequired(clear)) return { status: "reconnect_required" };
  if (!clear.ok) {
    const message = `Couldn't update your sheet [${clear.status}]`;
    await recordError(userId, message, false);
    throw new Error(`${message}: ${await clear.text()}`);
  }
  const write = await sheetsCall(
    key,
    `/v4/spreadsheets/${sheet.spreadsheet_id}/values/${range}!A1?valueInputOption=RAW`,
    { method: "PUT", body: JSON.stringify({ values }) },
  );
  if (!write.ok) {
    const message = `Couldn't update your sheet [${write.status}]`;
    await recordError(userId, message, false);
    throw new Error(`${message}: ${await write.text()}`);
  }
  await recordError(userId, null, true);
  return { status: "synced", rows: values.length - 1 };
}
