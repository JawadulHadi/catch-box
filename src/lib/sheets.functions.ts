import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  authorizeAppUserOAuth,
  disconnectAppUser,
  exchangeAppUserOAuthCode,
} from "@/integrations/lovable/appUserConnector";
import {
  deleteConnectionKeyForUser,
  getConnectionKeyForUser,
  saveConnectionKeyForUser,
} from "./app-user-connections.server";
import {
  GATEWAY_BASE_URL,
  SHEETS_CONNECTOR,
  SHEETS_SCOPES,
  syncSheetForUser,
} from "./sheets.server";

export const getSheetStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const key = await getConnectionKeyForUser(context.userId, SHEETS_CONNECTOR);
    const { data } = await context.supabase
      .from("sheet_exports")
      .select("spreadsheet_url, last_synced_at, last_error")
      .maybeSingle();
    return {
      connected: Boolean(key),
      url: data?.spreadsheet_url ?? null,
      lastSyncedAt: data?.last_synced_at ?? null,
      lastError: data?.last_error ?? null,
    };
  });

export const startSheetsConnect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const clientKey = process.env["GOOGLE_SHEETS_APP_USER_CONNECTOR_CLIENT_API_KEY"];
    if (!clientKey) throw new Error("Google Sheets isn't set up for this app yet.");
    const request = getRequest();
    const url = new URL(request.url);
    const sandboxHost =
      url.hostname === "localhost" ? request.headers.get("x-forwarded-host") : null;
    const returnUrl = new URL(
      "/oauth/google-sheets/return",
      sandboxHost ? `https://${sandboxHost}` : url.origin,
    ).toString();
    const existing = await getConnectionKeyForUser(context.userId, SHEETS_CONNECTOR);
    const { authorizationUrl } = await authorizeAppUserOAuth({
      gatewayBaseUrl: GATEWAY_BASE_URL,
      connectorId: SHEETS_CONNECTOR,
      appUserId: context.userId,
      clientAPIKey: clientKey,
      returnUrl,
      connectionAPIKey: existing ?? undefined,
      credentialsConfiguration: { scopes: SHEETS_SCOPES },
    });
    return { authorizationUrl };
  });

export const completeSheetsConnect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ code: z.string().min(1).max(2000) }).parse(data))
  .handler(async ({ data, context }) => {
    const { connectionAPIKey, connectorId } = await exchangeAppUserOAuthCode(
      GATEWAY_BASE_URL,
      data.code,
    );
    if (connectorId !== SHEETS_CONNECTOR)
      throw new Error("That sign-in was for a different service.");
    await saveConnectionKeyForUser(context.userId, connectorId, connectionAPIKey);
    return syncSheetForUser(context.userId);
  });

/** Called after every approval so the sheet always matches approved data. */
export const syncSheet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => syncSheetForUser(context.userId));

export const disconnectSheets = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const key = await getConnectionKeyForUser(context.userId, SHEETS_CONNECTOR);
    if (key) {
      await disconnectAppUser({
        gatewayBaseUrl: GATEWAY_BASE_URL,
        connectionAPIKey: key,
        connectorId: SHEETS_CONNECTOR,
      });
      await deleteConnectionKeyForUser(context.userId, SHEETS_CONNECTOR);
    }
    return { ok: true };
  });
