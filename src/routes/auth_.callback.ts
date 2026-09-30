import { createFileRoute } from "@tanstack/react-router";
import { serializeCookieHeader } from "@supabase/ssr";

import type { CookieToSet } from "@/integrations/supabase/client.server";

function redirectTo(location: string, cookies: CookieToSet[] = []): Response {
  const headers = new Headers({ Location: location });
  for (const { name, value, options } of cookies) {
    headers.append("Set-Cookie", serializeCookieHeader(name, value, options));
  }
  return new Response(null, { status: 303, headers });
}

function backToSignIn(message: string): Response {
  return redirectTo(`/auth?error=${encodeURIComponent(message)}`);
}

/**
 * Where Google and email sign-in links come back to. Swaps the one-time code for a
 * session, stores it in cookies, and opens the inbox.
 */
export const Route = createFileRoute("/auth_/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const params = new URL(request.url).searchParams;
        const code = params.get("code");
        if (!code) {
          return backToSignIn(
            params.get("error_description") ?? "That sign-in link didn't work. Try again.",
          );
        }

        const { createSupabaseServerClient } =
          await import("@/integrations/supabase/client.server");
        const cookies: CookieToSet[] = [];
        const supabase = createSupabaseServerClient((set) => cookies.push(...set));
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          return backToSignIn(
            "That sign-in link has expired or was opened in a different browser. Try again.",
          );
        }
        return redirectTo("/queue", cookies);
      },
    },
  },
});
