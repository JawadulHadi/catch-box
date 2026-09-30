import { createMiddleware } from "@tanstack/react-start";

import { createSupabaseServerClient } from "./client.server";

/**
 * Server-function middleware: reads the session cookie and hands the handler a
 * Supabase client that acts as that person, plus their user id. Throws when nobody
 * is signed in. Cross-site calls are already blocked by the CSRF middleware in start.ts.
 */
export const requireSupabaseAuth = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase.auth.getClaims();
    const userId = data?.claims.sub;
    if (error || !userId) throw new Error("Unauthorized: please sign in again.");
    return next({ context: { supabase, userId, claims: data.claims } });
  },
);
