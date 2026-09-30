# Catchbox wiki

Catchbox is a safety net for web scrapers. When a scraper hits a changed page, a "prove you're human" wall, or a missing field, it sends the failure to Catchbox instead of crashing or saving garbage. A person fixes it in one screen, and only approved records count as data.

**Live:** <https://catch-box.vercel.app> · **Code:** <https://github.com/JawadulHadi/catch-box>

## Pages

| Page                                  | Read it when you want to…                                           |
| ------------------------------------- | ------------------------------------------------------------------- |
| [Architecture](Architecture.md)       | understand how a request moves through the app and where data lives |
| [Deployment](Deployment.md)           | run it locally, deploy it to Vercel, or switch on optional features |
| [Database](Database.md)               | see the tables, functions and security rules, or change the schema  |
| [Scraper API](Scraper-API.md)         | send failures from your own scraper                                 |
| [Design system](Design-System.md)     | build screens with the Catchbox components and themes               |
| [Troubleshooting](Troubleshooting.md) | fix a setup or sign-in problem                                      |

## The screens

- **Needs a quick look** (`/queue`) — failed scrapes, newest first.
- **Fix it** (`/fix/:id`) — what the scraper got, why it stalled, and a form to fill the gap, with AI suggestions.
- **Approved data** (`/data`) — searchable, sortable, downloadable as CSV, synced to Google Sheets.
- **Your scrapers**, **Live status**, **Scraper history** — how each site is doing.
- **Build a scraper** (`/builder`) — a no-code scraper made from a page address and CSS selectors.
- **Connect your scraper** (`/connect`) — your personal key and a snippet.
- **Look and feel** (`/showcase`) — every theme and component.

This wiki is published from [`docs/wiki`](https://github.com/JawadulHadi/catch-box/tree/main/docs/wiki) in the repository. Edit it there, not on GitHub, or your changes will be overwritten.
