# Changelog

All notable changes to Catchbox. Dates are DD/MM/YYYY.

## 1.0.0 — 30/09/2026

The first release that runs on its own infrastructure: Vercel for hosting, Supabase for the database and sign-in. Live at <https://catch-box.vercel.app>.

### Added

- Glass themes: dark or light, five accents, solid or frosted glass — 20 combinations and 8 featured ones — in a new **Appearance** menu, with no flash on page load.
- Email sign-in links, alongside Google sign-in (the Google button appears once the provider is switched on).
- Approved data can be sorted by date.
- `bun run check-env` and `bun run typecheck`.
- Documentation: a wiki in `docs/wiki`, this changelog, and continuous integration on every pull request.

### Changed

- Hosting moved to Vercel. The build uses TanStack Start with Nitro, and the Lovable build tooling is gone.
- Sign-in sessions live in cookies, so protected pages redirect on the server before anything is sent.
- AI suggestions run through Vercel AI Gateway (`anthropic/claude-sonnet-5.5` by default) with structured output.
- Google Sheets talks to Google directly, with the narrow `drive.file` scope.
- The light theme's amber, success, warning and error colors are deeper, so all text reaches 4.5:1 contrast.
- Replacing your personal key now asks first, because it stops the old key straight away.

### Security

- No Supabase service role key anywhere. Server code runs as the signed-in person, and scrapers post through a database function that accepts only a valid key.
- Personal keys are stored as SHA-256 hashes and shown only once.
- Table privileges are limited to what each role needs; security definer functions pin their search path.
- The scraper builder checks every address, redirect and DNS answer against private networks when it connects.
- Scraped values can't run as formulas in CSV exports or Google Sheets.
- `.env` files are git-ignored.

### Fixed

- The scraper API always answers in JSON, including when something fails, and rejects bodies over 256 KB.
- A signed-out visit to a protected page no longer causes a hydration error.
- Missing settings show a setup page instead of crashing the app.
- `bun.lock` is a real lockfile, so installs are reproducible.

## 0.1.0 — 28/09/2026

The first version, built in Lovable: the inbox, Fix it, Approved data with CSV and Google Sheets, Your scrapers, Live status, Scraper history, the no-code scraper builder, and the Catchbox design system.
