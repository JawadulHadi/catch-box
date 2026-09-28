# Catchbox — a safety net for web scrapers

"When your scraper gets confused, a person fixes it before bad data ever reaches you."

A web app where every failed scrape lands in an inbox, a person fixes it in seconds, and only approved records become usable data.

## Look and feel

Dark ink background with an amber "catch" accent, Space Grotesk for headlines and IBM Plex Sans for body text — technical but warm, per your spec. All copy in plain, friendly English; no pipeline jargon.

## Screens

**Landing (home)** — the one-line pitch, a short plain-words explanation of the problem, a small preview of what the inbox looks like, and "Sign in with Google".

**Things that need a quick look** — the inbox. Failed scrapes, newest first: the site, the page address, a one-line reason (page changed, blocked by a CAPTCHA, missing info), and how long it's been waiting. Clicking a row opens Fix it.

**Fix it** — side by side: on the left, what the scraper tried to get and the raw error it hit; on the right, a simple form to type in the missing pieces. One "Approve" button moves it to Approved data. Also a "Skip for now" and a "Discard" option.

**Approved data** — everything checked and safe to use. Searchable, sortable by date, with a "Download CSV" button. (Google Sheet sync comes later.)

**Your scrapers** — the sites being watched, how often each one runs into trouble, and when it last had a problem.

**Connect your scraper** — your personal key plus a copy-paste code snippet, explained like plugging in a lamp: copy this, paste it in your script, done. Includes a button to replace the key if it ever leaks.

## Sign-in

Google sign-in only. Every screen except the landing page requires signing in. Your data is private to your account — nobody else can read or change it.

## Example data

Your account starts with a handful of realistic example failures and a few approved records, so the screens aren't empty. You can approve or discard them like real ones.

## README

Two sentences on the problem first, then setup and run instructions, then how to point a scraper at Catchbox.

## Technical notes

- Lovable Cloud (Postgres + auth) enabled; Google sign-in configured via the managed provider.
- Tables per spec: `human_triage_queue`, `scraped_warehouse`, `scraper_jobs`, `ingest_keys`. Billing tables (`usage_events`, `subscriptions`, `sheet_exports`) are out of scope for this build.
- Every table carries `owner_id default auth.uid()` with owner-only RLS, plus explicit grants to `authenticated` / `service_role`.
- `promote_triage_record(record_id, fixed_payload)` — one Postgres security-definer function: upsert into `scraped_warehouse` on `(owner_id, url)`, mark the queue row resolved, atomically. Called through an authenticated TanStack server function.
- Public ingest endpoint at `/api/public/triage/ingest`: validates a hashed `x-ingest-key`, resolves the owner from the key, inserts with the admin client. Never trusts a caller-supplied owner id.
- Reads use the browser Supabase client / authenticated server functions so RLS applies as the signed-in user; app screens live under `_authenticated/`, landing stays public.
- Example rows are inserted by a migration keyed to the signed-in user on first load of their account.
- TanStack Start routes: `/` (landing), `/queue`, `/queue/$id`, `/data`, `/scrapers`, `/connect`.
