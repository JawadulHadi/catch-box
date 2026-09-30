# Notes for coding agents

- Keep the reusable Catchbox design system self-contained under `src/design-system/catchbox/` and re-export it from `src/index.ts`; attached projects copy only this source subtree.
- Use `src/design-system/catchbox/styles.css` as the canonical Tailwind v4 theme entry; the app stylesheet imports it so preview and consumers share one source of truth.
- Keep Catchbox product routes, backend integrations, and app-only components outside the library barrel; attached projects must not inherit product behavior.
- The app has no Supabase service role key. Server code acts as the signed-in person (`createSupabaseServerClient`) or as anon (`createSupabaseAnonClient`); anything that must bypass row-level security belongs in a `security definer` function with `set search_path = ''` and its own checks.
- Change the database with `npx supabase migration new <name>` and `npx supabase db push` (after `npx supabase link --project-ref xdoofqcilrozsiwxmomw`); never edit a migration that has been applied. If you apply SQL through Supabase MCP or the dashboard instead, rename the file to the version the database recorded (`npx supabase migration list`), or `db push` will re-run it. Then regenerate types: `npx supabase gen types typescript --project-id xdoofqcilrozsiwxmomw > src/integrations/supabase/types.ts`.
- Deploys go to Vercel (`vercel.json`); Nitro writes `.vercel/output` during the Vercel build. Keep `bun.lock` in step with `package.json` (`bun install`), since Vercel installs with `--frozen-lockfile`.
