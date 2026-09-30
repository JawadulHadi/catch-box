import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  authorizationUrl,
  completeConnection,
  disconnect,
  googleSheetsConfigured,
  isConnected,
} from "./google.server";
import { syncSheetForUser } from "./sheets.server";

export const getSheetStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const available = googleSheetsConfigured();
    const connected = available && (await isConnected(context.supabase, context.userId));
    const { data } = await context.supabase
      .from("sheet_exports")
      .select("spreadsheet_url, last_synced_at, last_error")
      .maybeSingle();
    return {
      available,
      connected,
      url: data?.spreadsheet_url ?? null,
      lastSyncedAt: data?.last_synced_at ?? null,
      lastError: data?.last_error ?? null,
    };
  });

export const startSheetsConnect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (!googleSheetsConfigured())
      throw new Error("Google Sheets isn't set up on this server yet.");
    return { authorizationUrl: authorizationUrl(context.userId) };
  });

export const completeSheetsConnect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ code: z.string().min(1).max(2000), state: z.string().min(1).max(500) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await completeConnection(context.supabase, context.userId, data.code, data.state);
    return syncSheetForUser(context.supabase, context.userId);
  });

/** Called after every approval so the sheet always matches approved data. */
export const syncSheet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => syncSheetForUser(context.supabase, context.userId));

export const disconnectSheets = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (googleSheetsConfigured()) await disconnect(context.supabase, context.userId);
    return { ok: true };
  });
