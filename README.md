# Catchbox

Scrapers break quietly: a site changes its layout, throws up a "prove you're human" page, or hands back a page missing the one field you needed — and most scrapers either crash or save garbage without telling anyone. Catchbox is the step in between: every failed scrape lands in an inbox, a person fixes it in seconds, and only approved records ever count as real data.

> When your scraper gets confused, a person fixes it before bad data ever reaches you.

## The screens

| Screen | What it's for |
| --- | --- |
| Landing (`/`) | The pitch, plus a preview of what the inbox looks like |
| Things that need a quick look (`/queue`) | Failed scrapes, newest first, each with a one-line reason |
| Fix it (`/fix/:id`) | What the scraper got and why it stalled, side by side with a form to fill in the gap. One Approve action |
| Approved data (`/data`) | Everything checked and safe to use. Searchable, downloadable as CSV |
| Your scrapers (`/scrapers`) | Sites being watched and how often each runs into trouble |
| Connect your scraper (`/connect`) | Your personal key and a copy-paste snippet |

Sign-in is Google only. Every screen except the landing page requires signing in, and all data is private to your account.

## Running it

```bash
bun install
bun run dev
```

The app runs at http://localhost:8080. Environment values for the database and auth are already in `.env`; nothing else to configure.

Other commands:

```bash
bun run build   # production build
bun run lint    # lint
```

## Pointing a scraper at Catchbox

1. Sign in and open **Connect your scraper**.
2. Copy your personal key and the snippet.
3. Wherever your scraper would crash or save half-empty data, call `catch(...)` instead.

Under the hood that posts to `POST /api/public/triage/ingest` with an `x-ingest-key` header:

```json
{
  "url": "https://books.toscrape.com/catalogue/the-black-maria_991/index.html",
  "site": "books.toscrape.com",
  "reason": "page_changed",
  "got": { "title": "The Black Maria", "price": null },
  "missing": ["price"],
  "error": "Nothing matched \"p.price_color\""
}
```

The endpoint works out who the failure belongs to from the key alone — a caller can never claim someone else's account.

## How it's built

- TanStack Start (React 19, Vite), Tailwind CSS v4, shadcn/ui
- Postgres with row-level security: every table carries an owner, and policies scope every read and write to the signed-in user
- Approving is one all-or-nothing database function (`promote_triage_record`): it saves the fixed record and closes the inbox item together, so nothing can end up half saved
- Data access goes through `src/lib/catchbox-service.ts`; screens read it with React Query

## Project layout

```
src/
  design-system/catchbox/ reusable themes, fonts, and controls
  components/         Catchbox app-only UI (navigation and data views)
  lib/
    catchbox-service.ts   all database reads and writes
    format.ts             dates, relative times, CSV helpers
  routes/
    index.tsx             landing
    auth.tsx              sign-in
    _authenticated/       the signed-in screens
    api/public/triage/    the endpoint your scraper posts to
```

## Catchbox design system

The reusable light and dark themes, semantic colors, typography, and controls live in `src/design-system/catchbox/`. The app's `src/styles.css` imports its theme entry so this app also verifies the same styles attached projects receive. To use it in another Lovable project, attach this design-system project using **Use this design system** in the project menu, then import `@/design-system/catchbox/styles.css` once in that project's stylesheet and import controls from `@/design-system/catchbox`. Mount `useThemeSync()` in a client-rendered root to restore the saved appearance, and render `ThemeToggle` wherever people can switch themes. Open `/showcase` to compare the controls in both appearances.
