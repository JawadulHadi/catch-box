/**
 * Supabase settings, shared by the browser and the server. The publishable key is
 * safe to ship to the browser, so one pair of VITE_ variables serves both sides.
 */

function readEnv(name: string): string | undefined {
  const fromBuild = import.meta.env[name] as string | undefined;
  if (fromBuild) return fromBuild;
  // On the server, fall back to runtime variables (e.g. set after the build).
  return typeof process === "undefined" ? undefined : process.env[name];
}

export function supabaseUrl(): string | undefined {
  return readEnv("VITE_SUPABASE_URL");
}

export function supabasePublishableKey(): string | undefined {
  return readEnv("VITE_SUPABASE_PUBLISHABLE_KEY");
}

export function missingSupabaseEnv(): string[] {
  return [
    ...(supabaseUrl() ? [] : ["VITE_SUPABASE_URL"]),
    ...(supabasePublishableKey() ? [] : ["VITE_SUPABASE_PUBLISHABLE_KEY"]),
  ];
}

export function isSupabaseConfigured(): boolean {
  return missingSupabaseEnv().length === 0;
}

export function requireSupabaseEnv(): { url: string; key: string } {
  const url = supabaseUrl();
  const key = supabasePublishableKey();
  if (!url || !key) {
    throw new Error(
      `Missing Supabase settings: ${missingSupabaseEnv().join(", ")}. See .env.example.`,
    );
  }
  return { url, key };
}

/**
 * Publishable keys (sb_publishable_…) are not JWTs, so they must travel only in the
 * `apikey` header, never as a bearer token.
 */
export function supabaseFetch(key: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );
    if (init?.headers) new Headers(init.headers).forEach((value, name) => headers.set(name, value));
    if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
      headers.delete("Authorization");
    }
    headers.set("apikey", key);
    return fetch(input, { ...init, headers });
  };
}
