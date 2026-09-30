# Scraper API

Your scraper reports a failure with one HTTP request. Get your personal key and a ready-made Python snippet from **Connect your scraper** in the app.

## Request

```http
POST https://catch-box.vercel.app/api/public/triage/ingest
Content-Type: application/json
x-ingest-key: cbx_…
```

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

| Field     | Required | Rules                                                              |
| --------- | -------- | ------------------------------------------------------------------ |
| `url`     | Yes      | An `http` or `https` address, up to 2,000 characters               |
| `site`    | No       | Up to 200 characters. Defaults to the address's host               |
| `reason`  | No       | `page_changed`, `blocked`, `missing_info` or `other` (the default) |
| `got`     | No       | An object with whatever the scraper did manage to read             |
| `missing` | No       | Up to 50 field names, each up to 120 characters                    |
| `error`   | No       | The error text, up to 8,000 characters                             |

The whole body can be up to 256 KB.

## Responses

Every response is JSON.

| Status | Body                                           | Meaning                                  |
| ------ | ---------------------------------------------- | ---------------------------------------- |
| 201    | `{ "ok": true, "id": "…" }`                    | Saved; it's in the inbox                 |
| 400    | `{ "error": "Invalid payload", "details": … }` | Not JSON, or a field breaks the rules    |
| 401    | `{ "error": "That key is not valid" }`         | Missing or wrong `x-ingest-key`          |
| 413    | `{ "error": "Payload is larger than 256 KB" }` | Body too big                             |
| 500    | `{ "error": "…" }`                             | Catchbox couldn't save it; try again     |
| 503    | `{ "error": "…" }`                             | This deployment has no database settings |

## Example with curl

```bash
curl -X POST https://catch-box.vercel.app/api/public/triage/ingest \
  -H "Content-Type: application/json" \
  -H "x-ingest-key: $CATCHBOX_KEY" \
  -d '{"url":"https://example.com/item/1","reason":"missing_info","got":{"title":"Blue mug"},"missing":["price"]}'
```

## About the key

- The owner of a catch is worked out from the key alone. A caller can never file catches in someone else's account.
- Catchbox stores only a SHA-256 hash of the key, so it can show the full key only once, when it's made. If you lose it, replace it on **Connect your scraper**; the old key stops working at once.
- Keep the key out of source control; read it from an environment variable in your scraper.
