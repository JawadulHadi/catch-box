# Security policy

## Reporting a problem

Please don't open a public issue for security problems. Email security@catchbox.app with what you found and how to reproduce it. We'll reply within three working days and keep you updated until it's fixed.

## How Catchbox keeps data safe

- Every table uses row-level security, so each person only sees their own data.
- Scrapers send data with a personal key; the owner is always worked out from that key, never from what the scraper claims.
- Approving a record is one all-or-nothing step, so nothing is ever half saved.
- Google Sheets connection keys are stored encrypted and only read on the server.
