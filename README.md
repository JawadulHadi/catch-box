# Catchbox

[![CI](https://github.com/JawadulHadi/catch-box/actions/workflows/ci.yml/badge.svg)](https://github.com/JawadulHadi/catch-box/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![Live on Vercel](https://img.shields.io/badge/live-catch--box.vercel.app-black)](https://catch-box.vercel.app)

Scrapers break quietly: a site changes its layout, throws up a "prove you're human" page, or hands back a page missing the one field you needed — and most scrapers either crash or save garbage without telling anyone. Catchbox is the step in between: every failed scrape lands in an inbox, a person fixes it in seconds, and only approved records ever count as real data.

> When your scraper gets confused, a person fixes it before bad data ever reaches you.

**Live:** <https://catch-box.vercel.app>

## The screens

| Screen                                   | What it's for                                                                                                  |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Landing (`/`)                            | The pitch, plus a preview of what the inbox looks like                                                         |
| Sign in (`/auth`)                        | An emailed sign-in link, or Google once it's switched on                                                       |
| Things that need a quick look (`/queue`) | Failed scrapes, newest first, each with a one-line reason                                                      |
| Fix it (`/fix/:id`)                      | What the scraper got and why it stalled, next to a form to fill the gap. AI can suggest values. One Approve    |
| Approved data (`/data`)                  | Everything checked and safe to use. Searchable, sortable by date, downloadable as CSV, synced to Google Sheets |
| Your scrapers (`/scrapers`)              | Sites being watched, how often each runs into trouble, and sites that failed 3+ times in a day                 |
| Live status (`/status`)                  | Each scraper's last run and last clean run, refreshed every 15 seconds                                         |
| Scraper history (`/history`)             | 30 days of runs per site: success rate, run times, and a run-by-run strip                                      |
| Build a scraper (`/builder`)             | A no-code scraper: a page address plus CSS selectors, with "Run now"                                           |
| Connect your scraper (`/connect`)        | Your personal key (shown once) and a copy-paste snippet                                                        |
| Look and feel (`/showcase`)              | The design system: every theme, color, font and component                                                      |

### Who can open what

- **Anyone:** the landing page, sign-in, and Look and feel (`/showcase`). None of them show account data.
- **Signed in:** every other screen. A signed-out visit is redirected by the server before any page is sent. All data is private to your account; row-level security enforces it in the database.
- **Your scraper:** `POST /api/public/triage/ingest`, with your personal key instead of a sign-in.
- `/auth/callback` turns a sign-in link into a session, and `/oauth/google-sheets/return` is the pop-up page Google sends you back to while connecting Sheets. Neither shows anything on its own.

## Themes

Open **Appearance** in the sidebar (or on the landing page) to change how Catchbox looks. A theme is three choices that combine freely:

- **Mode:** dark or light
- **Accent:** amber, blue, violet, magenta or graphite
- **Surface:** solid panels, or frosted glass over a soft "catchlight" glow

That's 20 combinations, with 8 featured ones to start from. Your choice is saved in this browser. **Look and feel** shows every combination side by side. Colors that mean something (approved, a few hiccups, needs attention) look the same in every theme, and every text color reaches 4.5:1 contrast. If your system asks for reduced transparency, glass panels turn solid.

## How it's built

| Part            | What                                                                                                        |
| --------------- | ----------------------------------------------------------------------------------------------------------- |
| App             | TanStack Start (React 19, server rendering), Tailwind v4, the Catchbox design system in `src/design-system` |
| Hosting         | Vercel. Nitro builds `.vercel/output` during the Vercel build (`vercel.json`)                               |
| Database & auth | Supabase project `xdoofqcilrozsiwxmomw`. Sessions live in cookies (`@supabase/ssr`)                         |
| AI suggestions  | Vercel AI Gateway, `anthropic/claude-sonnet-5.5` by default (set `AI_MODEL` to change it)                   |
| Google Sheets   | Google OAuth directly, `drive.file` scope, refresh tokens encrypted with AES-256-GCM                        |

There is no Supabase service role key anywhere. Server code runs as the signed-in person, so row-level security applies to every query. Scrapers post through `ingest_catch()`, a database function that accepts only a valid personal key, and personal keys are stored as SHA-256 hashes.

## Documentation

| Where                                                         | What                                                                  |
| ------------------------------------------------------------- | --------------------------------------------------------------------- |
| [Wiki](./docs/wiki/Home.md)                                   | Architecture, deployment, database, scraper API, design system, fixes |
| [Changelog](./CHANGELOG.md)                                   | What changed in each release                                          |
| [Contributing](./CONTRIBUTING.md)                             | Setting up, making a change, house rules                              |
| [Security](./SECURITY.md)                                     | Reporting a problem, and how data is protected                        |
| [Code of conduct](./CODE_OF_CONDUCT.md)                       | How we treat each other                                               |
| [Design system guide](./src/design-system/catchbox/README.md) | Using the Catchbox components and themes                              |

The wiki pages live in `docs/wiki` and are published to the [GitHub wiki](https://github.com/JawadulHadi/catch-box/wiki) on every push to `main`.

## Running it

### You'll need

- **Node.js 24** (22.19 or later works). With nvm: `nvm install 24` then `nvm use 24`.
- [Bun](https://bun.sh) for installs and scripts: `npm install -g bun`.

### Steps

```bash
cp .env.example .env          # then fill it in — see Settings
bun install --frozen-lockfile # installs exactly what bun.lock lists
bun run check-env             # says what's missing and what that switches off
bun run dev
```

The app runs at <http://localhost:8080>. Use `bun add <package>` to add packages — not npm, which writes a second lockfile.

### Settings

| Variable                                    | Needed for                                   | Where it comes from                                                                    |
| ------------------------------------------- | -------------------------------------------- | -------------------------------------------------------------------------------------- |
| `VITE_SUPABASE_URL`                         | Required. Everything                         | Supabase → Project Settings → API                                                      |
| `VITE_SUPABASE_PUBLISHABLE_KEY`             | Required. Everything                         | Supabase → Project Settings → API keys (`sb_publishable_…`, safe in the browser)       |
| `AI_GATEWAY_API_KEY` or `VERCEL_OIDC_TOKEN` | "Suggest values" on Fix it (local runs only) | `vercel env pull .env.local` (token lasts 12 hours), or Vercel → AI Gateway → API keys |
| `AI_MODEL`                                  | Optional. Which model suggests values        | Any AI Gateway model id                                                                |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`  | "Connect Google Sheets" on Approved data     | Google Cloud → APIs & Services → Credentials (see below)                               |
| `TOKEN_ENCRYPTION_KEY`                      | Encrypting stored Google connections         | `openssl rand -base64 32`; use the same value everywhere that shares the database      |

`.env` and `.env.local` are git-ignored. On Vercel the same variables live under Project → Settings → Environment Variables; the Supabase pair and `TOKEN_ENCRYPTION_KEY` are already set there.

### Other commands

```bash
bun run build      # production build (.output locally, .vercel/output on Vercel)
bun run preview    # serve the production build
bun run lint       # lint
bun run typecheck  # type-check without building
bun run format     # format with Prettier
bun run check-env  # check local settings
```

## Switching features on

### Sign-in

- **Email links** work now. Supabase's built-in email sender only delivers to members of the Supabase team and allows a few emails an hour. To let anyone sign in, add your own SMTP server under Supabase → Authentication → Emails → SMTP settings.
- **Google** needs a Google OAuth client:
  1. Google Cloud → APIs & Services → Credentials → Create credentials → OAuth client ID → **Web application**.
  2. Authorized redirect URI: `https://xdoofqcilrozsiwxmomw.supabase.co/auth/v1/callback`.
  3. Supabase → Authentication → Sign In / Providers → **Google**: switch it on and paste the client ID and secret.

  The Google button appears on the sign-in page by itself once Supabase reports the provider is on.

Supabase already allows sign-in links back to `https://catch-box.vercel.app`, preview deployments, and `http://localhost:8080` (see `supabase/config.toml`).

### Google Sheets

Use the same Google OAuth client (or another one):

1. Google Cloud → APIs & Services → Library: enable the **Google Sheets API**.
2. Add authorized redirect URIs `https://catch-box.vercel.app/oauth/google-sheets/return` and `http://localhost:8080/oauth/google-sheets/return`.
3. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` on Vercel (and in `.env`), then redeploy.

Until then, Approved data says Sheets isn't set up, and CSV download still works.

### AI suggestions

The code is live: on Vercel it signs in to AI Gateway with the deployment's own OIDC token, so no key is stored. Vercel only serves AI Gateway requests once the team has a card on file, which also unlocks the free monthly credits: Vercel → AI Gateway → add a card. Until then, "Suggest values" says so.

## Database

The schema lives in `supabase/migrations/` and is already applied to the project. Link the folder to the project once per clone (the link is stored in the git-ignored `supabase/.temp`), then create, apply and type each change:

```bash
npx supabase link --project-ref xdoofqcilrozsiwxmomw   # once per clone
npx supabase migration new add_something              # creates a correctly named file
npx supabase db push                                   # applies anything not yet applied
npx supabase gen types typescript --project-id xdoofqcilrozsiwxmomw > src/integrations/supabase/types.ts
```

`npx supabase migration list` shows local and remote side by side; each file's timestamp must match the version the database recorded.

## Deploying

```bash
npx vercel deploy --prod
```

The project is linked in `.vercel/`. Vercel installs with Bun from `bun.lock` and builds with `npm run build`.

## Pointing a scraper at Catchbox

1. Sign in and open **Connect your scraper**.
2. Copy your personal key and the snippet. The key is shown only once; if you lose it, replace it.
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

Only `url` is required. `reason` is one of `page_changed`, `blocked`, `missing_info` or `other`, and `site` defaults to the page's host. Every answer is JSON:

| Status | Meaning                                           |
| ------ | ------------------------------------------------- |
| 201    | Saved — `{ "ok": true, "id": "…" }`               |
| 400    | The body isn't valid JSON or doesn't match above  |
| 401    | The `x-ingest-key` header is missing or not valid |
| 413    | The body is over 256 KB                           |
| 500    | Catchbox couldn't save it; try again shortly      |
| 503    | This Catchbox isn't connected to its database yet |

_The endpoint works out who the failure belongs to from the key alone — a caller can never claim someone else's account._

## License

[MIT](./LICENSE) © 2026 Jawad Ul Hadi

<p align="center" style="font-family: system-ui, sans-serif; color: #333; line-height: 1.6;">
  Built by <strong>Jawad Ul Hadi</strong> | Backend Lead &amp; Architect — AI-First Systems Design &amp; Generative AI · 
  <a href="https://gravatar.com/juhbukhari" target="_blank" rel="noopener noreferrer" style="color: #0066cc; text-decoration: none; font-weight: 500;">Let's Connect</a>
</p>
