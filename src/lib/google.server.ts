// Google sign-in for Google Sheets access, done directly against Google's OAuth
// endpoints. Server-only: the client secret and encryption key never reach the browser.
import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { getRequest } from "@tanstack/react-start/server";

import type { createSupabaseServerClient } from "@/integrations/supabase/client.server";

type SupabaseServer = ReturnType<typeof createSupabaseServerClient>;

export const GOOGLE_PROVIDER = "google";
// drive.file: only files Catchbox itself creates. Enough for its own sheet, and it
// doesn't need Google's review for sensitive scopes.
const SCOPES = ["https://www.googleapis.com/auth/drive.file"];
const STATE_TTL_MS = 10 * 60 * 1000;
export const RETURN_PATH = "/oauth/google-sheets/return";

export class ReconnectRequiredError extends Error {}

function env(name: string): string | undefined {
  return process.env[name] || undefined;
}

export function googleSheetsConfigured(): boolean {
  return Boolean(
    env("GOOGLE_CLIENT_ID") && env("GOOGLE_CLIENT_SECRET") && env("TOKEN_ENCRYPTION_KEY"),
  );
}

function secrets() {
  const clientId = env("GOOGLE_CLIENT_ID");
  const clientSecret = env("GOOGLE_CLIENT_SECRET");
  const rawKey = env("TOKEN_ENCRYPTION_KEY");
  if (!clientId || !clientSecret || !rawKey) {
    throw new Error("Google Sheets isn't set up on this server yet.");
  }
  const key = Buffer.from(rawKey, "base64");
  if (key.length !== 32) throw new Error("TOKEN_ENCRYPTION_KEY must be 32 bytes in base64.");
  return { clientId, clientSecret, key };
}

/** This deployment's public address, as the browser sees it. */
export function requestOrigin(): string {
  const request = getRequest();
  const url = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? url.host;
  const proto = request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  return `${proto.split(",")[0]}://${host.split(",")[0]}`;
}

// --- Refresh token encryption (AES-256-GCM) ---------------------------------------

function encrypt(plaintext: string, key: Buffer): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const body = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString("base64");
}

function decrypt(stored: string, key: Buffer): string {
  const data = Buffer.from(stored, "base64");
  const decipher = createDecipheriv("aes-256-gcm", key, data.subarray(0, 12));
  decipher.setAuthTag(data.subarray(12, 28));
  return Buffer.concat([decipher.update(data.subarray(28)), decipher.final()]).toString("utf8");
}

// --- OAuth state: ties the Google round trip to the person who started it ----------

function sign(value: string, key: Buffer): string {
  return createHmac("sha256", key).update(`sheets-state:${value}`).digest("base64url");
}

function makeState(userId: string, key: Buffer): string {
  const payload = `${userId}.${Date.now() + STATE_TTL_MS}.${randomBytes(12).toString("base64url")}`;
  return `${payload}.${sign(payload, key)}`;
}

function checkState(state: string, userId: string, key: Buffer): boolean {
  const cut = state.lastIndexOf(".");
  if (cut < 0) return false;
  const payload = state.slice(0, cut);
  const given = Buffer.from(state.slice(cut + 1));
  const expected = Buffer.from(sign(payload, key));
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return false;
  const [owner, expires] = payload.split(".");
  return owner === userId && Number(expires) > Date.now();
}

// --- Google endpoints ----------------------------------------------------------------

export function authorizationUrl(userId: string): string {
  const { clientId, key } = secrets();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${requestOrigin()}${RETURN_PATH}`,
    response_type: "code",
    scope: SCOPES.join(" "),
    access_type: "offline",
    // Always ask, so Google always returns a refresh token.
    prompt: "consent",
    include_granted_scopes: "true",
    state: makeState(userId, key),
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

async function tokenRequest(body: Record<string, string>) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body),
  });
  const json = (await response.json().catch(() => ({}))) as {
    access_token?: string;
    refresh_token?: string;
    error?: string;
  };
  return { ok: response.ok, ...json };
}

/** Finishes the Google round trip and stores the encrypted refresh token. */
export async function completeConnection(
  supabase: SupabaseServer,
  userId: string,
  code: string,
  state: string,
): Promise<void> {
  const { clientId, clientSecret, key } = secrets();
  if (!checkState(state, userId, key)) {
    throw new Error("That Google window expired or belongs to another session. Try again.");
  }
  const token = await tokenRequest({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: `${requestOrigin()}${RETURN_PATH}`,
    grant_type: "authorization_code",
  });
  if (!token.ok || !token.refresh_token) {
    throw new Error("Google didn't finish connecting. Try again.");
  }
  const { error } = await supabase.from("oauth_connections").upsert(
    {
      owner_id: userId,
      provider: GOOGLE_PROVIDER,
      refresh_token_ciphertext: encrypt(token.refresh_token, key),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "owner_id,provider" },
  );
  if (error) throw new Error("We couldn't save the Google connection. Try again.");
}

async function storedRefreshToken(supabase: SupabaseServer, userId: string, key: Buffer) {
  const { data, error } = await supabase
    .from("oauth_connections")
    .select("refresh_token_ciphertext")
    .eq("owner_id", userId)
    .eq("provider", GOOGLE_PROVIDER)
    .maybeSingle();
  if (error) throw error;
  return data ? decrypt(data.refresh_token_ciphertext, key) : null;
}

export async function isConnected(supabase: SupabaseServer, userId: string): Promise<boolean> {
  const { count } = await supabase
    .from("oauth_connections")
    .select("owner_id", { count: "exact", head: true })
    .eq("owner_id", userId)
    .eq("provider", GOOGLE_PROVIDER);
  return (count ?? 0) > 0;
}

/** A fresh access token, or null when the person hasn't connected Google. */
export async function accessToken(supabase: SupabaseServer, userId: string) {
  const { clientId, clientSecret, key } = secrets();
  const refreshToken = await storedRefreshToken(supabase, userId, key);
  if (!refreshToken) return null;
  const token = await tokenRequest({
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
  });
  if (token.error === "invalid_grant") throw new ReconnectRequiredError();
  if (!token.ok || !token.access_token) throw new Error("Google didn't hand out access.");
  return token.access_token;
}

/** Revokes Catchbox's access at Google and forgets the connection. */
export async function disconnect(supabase: SupabaseServer, userId: string): Promise<void> {
  const { key } = secrets();
  const refreshToken = await storedRefreshToken(supabase, userId, key).catch(() => null);
  if (refreshToken) {
    await fetch("https://oauth2.googleapis.com/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token: refreshToken }),
    }).catch(() => null);
  }
  await supabase
    .from("oauth_connections")
    .delete()
    .eq("owner_id", userId)
    .eq("provider", GOOGLE_PROVIDER);
}
