/**
 * App User Connector helpers. Server-only: import only from server function
 * handlers or *.server.ts modules — never from browser code.
 */

function requireApiKey(): string {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("LOVABLE_API_KEY is not set.");
  return key;
}

export interface AppUserOAuthAuthorizeParams {
  gatewayBaseUrl: string;
  connectorId: string;
  appUserId: string;
  clientAPIKey: string;
  returnUrl: string;
  connectionAPIKey?: string;
  credentialsConfiguration?: Record<string, unknown>;
}

export async function authorizeAppUserOAuth(
  params: AppUserOAuthAuthorizeParams,
): Promise<{ authorizationUrl: string; sessionId: string }> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${requireApiKey()}`,
    "Content-Type": "application/json",
    "X-Client-Api-Key": params.clientAPIKey,
  };
  if (params.connectionAPIKey) headers["X-Connection-Api-Key"] = params.connectionAPIKey;
  const res = await fetch(`${params.gatewayBaseUrl}/api/v1/app-users/oauth2/authorize`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      connector_id: params.connectorId,
      app_user_id: params.appUserId,
      return_url: params.returnUrl,
      credentials_configuration: params.credentialsConfiguration,
    }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`App User OAuth start failed (${res.status}): ${text}`);
  const body = (text ? JSON.parse(text) : {}) as { authorization_url?: string; session_id?: string };
  if (!body.authorization_url) throw new Error("App User OAuth start response missing authorization_url");
  return { authorizationUrl: body.authorization_url, sessionId: body.session_id ?? "" };
}

export interface CallAsAppUserParams {
  gatewayBaseUrl: string;
  connectionAPIKey: string;
  connectorId: string;
  path: string;
  init?: RequestInit;
  requiredScopes?: string[];
}

export async function callAsAppUser(params: CallAsAppUserParams): Promise<Response> {
  const path = params.path.startsWith("/") ? params.path : `/${params.path}`;
  const headers = new Headers(params.init?.headers);
  headers.set("Authorization", `Bearer ${requireApiKey()}`);
  headers.set("X-Connection-Api-Key", params.connectionAPIKey);
  if (params.requiredScopes?.length) headers.set("X-Lovable-Required-Scopes", params.requiredScopes.join(" "));
  return fetch(`${params.gatewayBaseUrl}/${params.connectorId}${path}`, { ...params.init, headers });
}

/** A 401 whose body type starts with "credential_" means the user must reconnect. */
export async function appUserReconnectRequired(res: Response): Promise<boolean> {
  if (res.status !== 401) return false;
  const body = (await res.clone().json().catch(() => null)) as { type?: unknown } | null;
  return typeof body?.type === "string" && body.type.startsWith("credential_");
}

export async function disconnectAppUser(params: {
  gatewayBaseUrl: string;
  connectionAPIKey: string;
  connectorId: string;
}): Promise<void> {
  const res = await fetch(`${params.gatewayBaseUrl}/api/v1/app-users/connection`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${requireApiKey()}`,
      "X-Connection-Api-Key": params.connectionAPIKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ connector_id: params.connectorId }),
  });
  if (!res.ok) throw new Error(`App User disconnect failed (${res.status}): ${await res.text()}`);
}

export async function exchangeAppUserOAuthCode(
  gatewayBaseUrl: string,
  code: string,
): Promise<{ connectionAPIKey: string; connectorId: string }> {
  const res = await fetch(`${gatewayBaseUrl}/api/v1/app-users/oauth2/exchange`, {
    method: "POST",
    headers: { Authorization: `Bearer ${requireApiKey()}`, "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`App User OAuth exchange failed (${res.status}): ${text}`);
  const body = (text ? JSON.parse(text) : {}) as { api_key?: string; connector_id?: string };
  if (!body.api_key || !body.connector_id) throw new Error("App User OAuth exchange response incomplete");
  return { connectionAPIKey: body.api_key, connectorId: body.connector_id };
}
