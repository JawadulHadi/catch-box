# Security policy

## Reporting a problem

Please don't open a public issue for security problems. Report them privately through [GitHub's vulnerability reporting](https://github.com/JawadulHadi/catch-box/security/advisories/new), with what you found and how to reproduce it. We'll reply within three working days and keep you updated until it's fixed.

## Supported versions

Only the latest release, deployed at <https://catch-box.vercel.app>, gets security fixes.

## How Catchbox keeps data safe

- Every table uses row-level security, so each person only sees their own data, and each role has only the table privileges it needs.
- The app runs without a Supabase service role key. Server code acts as the signed-in person, so a bug can't reach someone else's rows.
- Scrapers send data with a personal key. Only its SHA-256 hash is stored, the key is shown once, and the owner is always worked out from the key, never from what the scraper claims.
- Sign-in sessions live in cookies; server functions refuse calls from other sites.
- Approving a record is one all-or-nothing step, so nothing is ever half saved.
- Google Sheets access uses the narrow `drive.file` scope, and refresh tokens are encrypted with AES-256-GCM before they're stored.
- The scraper builder only opens public pages: every address, redirect and DNS answer is checked against private networks at connect time.
- Scraped values are defused before CSV export and written to Google Sheets as plain text, so they can't run as spreadsheet formulas.
