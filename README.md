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

Under the hood, it posts to `POST /api/public/triage/ingest` with an `x-ingest-key` header:

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

_The endpoint works out who the failure belongs to from the key alone — a caller can never claim someone else's account_
