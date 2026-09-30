// Server-only Supabase clients. Every query runs as the signed-in person (or as anon),
// so row-level security always applies; the app has no service role key.
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { getCookies, setCookie } from "@tanstack/react-start/server";

import { requireSupabaseEnv, supabaseFetch } from "./env";
import type { Database } from "./types";

export type CookieToSet = { name: string; value: string; options: CookieOptions };

/**
 * A client acting as whoever's session cookies came with the current request.
 * Refreshed session cookies go onto the response, unless `onSetCookies` collects
 * them (for handlers that build their own Response).
 */
export function createSupabaseServerClient(onSetCookies?: (cookies: CookieToSet[]) => void) {
  const { url, key } = requireSupabaseEnv();
  return createServerClient<Database>(url, key, {
    global: { fetch: supabaseFetch(key) },
    cookies: {
      getAll: () => Object.entries(getCookies()).map(([name, value]) => ({ name, value })),
      setAll: (cookies) => {
        if (onSetCookies) return onSetCookies(cookies);
        for (const { name, value, options } of cookies) {
          setCookie(name, value, options as Parameters<typeof setCookie>[2]);
        }
      },
    },
  });
}

/** An anonymous client for public endpoints, such as scrapers posting catches. */
export function createSupabaseAnonClient() {
  const { url, key } = requireSupabaseEnv();
  return createClient<Database>(url, key, {
    global: { fetch: supabaseFetch(key) },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
