import { createIsomorphicFn } from "@tanstack/react-start";

import { supabase } from "@/integrations/supabase/client";
import { isSupabaseConfigured } from "@/integrations/supabase/env";

export type SessionUser = { id: string; email: string | null };

/**
 * Who is signed in. On the server it reads the session cookie, so protected pages
 * redirect before any HTML is sent; in the browser it reads the same cookie locally,
 * so moving between pages costs no round trip.
 */
export const getSessionUser = createIsomorphicFn()
  .server(async (): Promise<SessionUser | null> => {
    if (!isSupabaseConfigured()) return null;
    const { createSupabaseServerClient } = await import("@/integrations/supabase/client.server");
    const { data } = await createSupabaseServerClient().auth.getClaims();
    const claims = data?.claims;
    if (!claims?.sub) return null;
    return { id: claims.sub, email: typeof claims.email === "string" ? claims.email : null };
  })
  .client(async (): Promise<SessionUser | null> => {
    if (!isSupabaseConfigured()) return null;
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;
    return user ? { id: user.id, email: user.email ?? null } : null;
  });
