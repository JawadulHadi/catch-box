# Architecture

## The pieces

| Part            | Technology                                                                  | Where                                                  |
| --------------- | --------------------------------------------------------------------------- | ------------------------------------------------------ |
| Web app         | TanStack Start (React 19, server rendering, file-based routes), Tailwind v4 | `src/routes`, `src/components`                         |
| Design system   | Catchbox components, tokens and themes                                      | `src/design-system/catchbox`                           |
| Server code     | TanStack server functions and API routes, built by Nitro                    | `src/lib/*.functions.ts`, `src/routes/api`             |
| Hosting         | Vercel (Node.js 24 functions)                                               | `vercel.json`                                          |
| Database & auth | Supabase Postgres and Auth                                                  | `supabase/migrations`                                  |
| AI suggestions  | Vercel AI Gateway → `anthropic/claude-sonnet-5.5`                           | `src/lib/suggest.server.ts`                            |
| Google Sheets   | Google OAuth and the Sheets API, called directly                            | `src/lib/google.server.ts`, `src/lib/sheets.server.ts` |

## Who can do what

There is **no Supabase service role key** in this app. Every database call runs as one of two roles:

- **The signed-in person.** The browser and the server both use the session stored in cookies (`@supabase/ssr`). Row-level security limits every query to that person's rows.
- **Anonymous.** Used only by the scraper API, which can call exactly one database function, `ingest_catch()`. That function finds the owner from the hash of the scraper's key and returns nothing for a wrong key.

Anything that must cross that line is a `security definer` function in the database with its own checks (see [Database](Database.md)).

## A page load

1. The browser asks for `/queue`.
2. The `_authenticated` route's `beforeLoad` runs on the server and reads the session cookie (`src/lib/session.ts`).
3. No session: the server answers `307 → /auth` before rendering anything. With a session: the page renders on the server.
4. In the browser, React Query loads the inbox through the Supabase client, as the signed-in person.
5. Later page changes check the session in the browser, without a round trip.

## Signing in

1. `/auth` offers an email link, and Google once it's switched on in Supabase. The page asks Supabase which providers are on.
2. Both methods come back to `/auth/callback?code=…` (`src/routes/auth_.callback.ts`).
3. The callback swaps the one-time code for a session, stores it in cookies, and redirects to `/queue`.

## Server functions

Server functions (`createServerFn`) use `requireSupabaseAuth` (`src/integrations/supabase/auth-middleware.ts`), which reads the session cookie and gives the handler a Supabase client acting as that person. `src/start.ts` adds CSRF protection, so other sites can't call them with a visitor's cookies.

| File                                     | What it does                                                |
| ---------------------------------------- | ----------------------------------------------------------- |
| `src/lib/suggest.functions.ts`           | AI suggestions for empty fields on Fix it                   |
| `src/lib/recipes.functions.ts`           | Saves and runs no-code scrapers                             |
| `src/lib/sheets.functions.ts`            | Connects, syncs and disconnects Google Sheets               |
| `src/routes/api/public/triage/ingest.ts` | The scraper API (a plain HTTP route, not a server function) |

## Fetching web pages safely

The scraper builder fetches pages people type in, so it could be pointed at private networks. `src/lib/public-fetch.server.ts` prevents that:

- Only `http` and `https`, and never `localhost`, `.local` or `.internal` names.
- Every DNS answer is checked at connect time against private, loopback, link-local, carrier-grade NAT, documentation and multicast ranges, for IPv4 and IPv6. A public name that resolves to `127.0.0.1` is refused.
- Redirects are followed by hand (at most five) and each hop is checked again.
- Pages over 5 MB and requests over 15 seconds are cut off.

## Themes without a flash

`themeInitScript` runs in the document `<head>` and applies the saved theme before the first paint. `useThemeSync()` in the root route keeps it in sync afterwards. See [Design system](Design-System.md).
