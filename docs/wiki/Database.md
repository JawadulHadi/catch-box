# Database

Supabase project `xdoofqcilrozsiwxmomw`. The schema is in `supabase/migrations/`, and TypeScript types are generated into `src/integrations/supabase/types.ts`.

## Tables

Every table is owner-only through row-level security, and `owner_id` references `auth.users` with `on delete cascade`, so deleting a person deletes their data.

| Table                | Holds                                                           | Signed-in person can           |
| -------------------- | --------------------------------------------------------------- | ------------------------------ |
| `human_triage_queue` | Failed scrapes: page, reason, what was captured, what's missing | read, add, change, delete      |
| `scraped_warehouse`  | Approved records, one per page address                          | read, add, change, delete      |
| `scraper_jobs`       | Sites being watched and their failure counts                    | read, add, change, delete      |
| `scraper_runs`       | One row per scraper run, for history                            | read, add                      |
| `scraper_alerts`     | A site that failed 3+ times in 24 hours (one per site per day)  | read                           |
| `scraper_recipes`    | No-code scrapers from the builder                               | read, add, change, delete      |
| `ingest_keys`        | The hash and prefix of each person's scraper key                | read the prefix and dates only |
| `oauth_connections`  | Encrypted Google refresh tokens                                 | read, add, change, delete      |
| `sheet_exports`      | The person's Google Sheet and when it last synced               | read, add, change, delete      |

The anonymous role has no table access at all.

## Functions

All are `security definer` with `set search_path = ''` and fully qualified names.

| Function                          | Called by          | Does                                                                                                                             |
| --------------------------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| `ingest_catch(p_key, p_url, …)`   | anon (scraper API) | Finds the owner by the key's SHA-256 hash, adds the catch, updates the site's counts, logs a run. Returns `null` for a wrong key |
| `ensure_ingest_key(p_rotate)`     | signed-in          | Makes or replaces the person's key. Returns the full key only when it's new                                                      |
| `promote_triage_record(id, data)` | signed-in          | Approves a catch in one step: saves the record and closes the catch                                                              |
| `seed_demo_data()`                | signed-in          | Adds example catches, records and runs the first time someone signs in                                                           |
| `flag_repeated_failures()`        | trigger            | Raises an alert after the third failure for a site within 24 hours                                                               |

Supabase's security advisor flags that anon and signed-in people can run these functions. That's intended: each one checks its caller itself.

## Changing the schema

1. Once per clone, link the folder to the project: `npx supabase link --project-ref xdoofqcilrozsiwxmomw`. The link lives in the git-ignored `supabase/.temp`, so a fresh clone needs it again.
2. Create the file with `npx supabase migration new <name>`, so it gets a proper timestamp. Never edit a migration that has been applied.
3. Apply it: `npx supabase db push`.
   - If you apply SQL another way (the dashboard, or an AI tool using Supabase MCP), Supabase records its own timestamp. Rename the file to match, or `db push` will try to run it again. `npx supabase migration list` shows local and remote side by side.
4. Regenerate the types:

   ```bash
   npx supabase gen types typescript --project-id xdoofqcilrozsiwxmomw > src/integrations/supabase/types.ts
   ```

5. Grant only what the app needs. New Supabase projects give `anon` and `authenticated` every privilege on new tables by default, so revoke first and grant back explicitly (see `20260930142021_tighten_grants.sql`).
