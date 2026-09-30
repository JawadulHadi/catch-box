# Roadmap

- [x] AI suggestions for missing fields on the Fix it screen (prefills the form)
- [x] Project docs set (code of conduct, contributing, security, license)
- [x] Repeated-failure detection (3 in 24h, one alert per site per day), shown on Your scrapers
- [x] Google Sheets sync per user (connect on Approved data, resyncs on every approval)
- [x] Live status screen (last run per scraper, records in the sheet)
- [x] No-code scraper builder with "Run now" (clean runs → approved + sheet, failures → inbox)
- [ ] Email delivery of scraper alerts — waiting on the owner setting up their email domain
- [ ] Connect the owner's own scraper script — needs the owner to run the snippet on their machine
- [x] Reusable Catchbox light/dark design system and theme showcase
- [x] Glass themes: dark/light × 5 accents × solid/glass, 8 featured combinations, Appearance menu, no flash on load
- [x] Local setup that works end to end: real lockfile, complete `.env.example`, `check-env`
- [x] Runs on Vercel + Supabase: cookie sessions, email-link and Google sign-in, no service role key, hashed personal keys, AI suggestions through Vercel AI Gateway, direct Google Sheets OAuth
- [ ] Custom email sender (SMTP) so sign-in links reach anyone, not only the Supabase team
