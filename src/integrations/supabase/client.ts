import { createBrowserClient } from "@supabase/ssr";

import { requireSupabaseEnv, supabaseFetch } from "./env";
import type { Database } from "./types";

function createSupabaseClient() {
  const { url, key } = requireSupabaseEnv();
  // The session lives in cookies, so the server can tell who is signed in.
  return createBrowserClient<Database>(url, key, { global: { fetch: supabaseFetch(key) } });
}

let client: ReturnType<typeof createSupabaseClient> | undefined;

/**
 * The browser's Supabase client, created on first use so pages still render when the
 * settings are missing. Import it like this:
 * import { supabase } from "@/integrations/supabase/client";
 */
export const supabase = new Proxy({} as ReturnType<typeof createSupabaseClient>, {
  get(_, prop, receiver) {
    client ??= createSupabaseClient();
    return Reflect.get(client, prop, receiver);
  },
});
