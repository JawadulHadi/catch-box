# Deployment

## Run it locally

You need **Node.js 24** (22.19 or later works; the repo's `.nvmrc` says 24) and [Bun](https://bun.sh).

```bash
cp .env.example .env          # add your Supabase URL and publishable key
bun install --frozen-lockfile
bun run check-env             # lists anything missing and what it switches off
bun run dev                   # http://localhost:8080
```

Add packages with `bun add`, not npm, so `bun.lock` stays the only lockfile.

## Environment variables

| Variable                                    | Required | Used for                                                          |
| ------------------------------------------- | -------- | ----------------------------------------------------------------- |
| `VITE_SUPABASE_URL`                         | Yes      | Everything. Supabase → Project Settings → API                     |
| `VITE_SUPABASE_PUBLISHABLE_KEY`             | Yes      | Everything. The `sb_publishable_…` key, safe in the browser       |
| `AI_GATEWAY_API_KEY` or `VERCEL_OIDC_TOKEN` | No       | AI suggestions on local runs. Not needed on Vercel                |
| `AI_MODEL`                                  | No       | Any AI Gateway model id. Default `anthropic/claude-sonnet-5.5`    |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`  | No       | Google Sheets sync                                                |
| `TOKEN_ENCRYPTION_KEY`                      | No       | Encrypts stored Google refresh tokens (`openssl rand -base64 32`) |

Use the same `TOKEN_ENCRYPTION_KEY` everywhere that shares a database, or stored Google connections can't be read.

## Deploy to Vercel

The Vercel project `catch-box` is connected to this repository: every push to `main` deploys production, and every pull request gets a preview. To deploy by hand from a linked folder:

```bash
npx vercel deploy --prod
```

What happens during a Vercel build (`vercel.json`):

1. Install: `npx -y bun@1.4.2 install --frozen-lockfile`.
2. Build: `npm run build`. Nitro sees it's on Vercel and writes `.vercel/output`.
3. Vercel serves the static files and runs the server as Node.js 24 functions.

Variables are set under Project → Settings → Environment Variables. `VITE_` variables are baked into the browser bundle at build time, so redeploy after changing them.

## Supabase settings

`supabase/config.toml` records the sign-in addresses Supabase allows: the production site, preview deployments, and `http://localhost:8080`. To push changes to them:

```bash
npx supabase config push --project-ref xdoofqcilrozsiwxmomw
```

The command shows a diff and asks before changing anything. Settings not listed in the file are left alone.

## Switch on optional features

### Google sign-in

1. Google Cloud → APIs & Services → Credentials → **Create OAuth client ID** → Web application.
2. Authorized redirect URI: `https://xdoofqcilrozsiwxmomw.supabase.co/auth/v1/callback`.
3. Supabase → Authentication → Sign In / Providers → **Google**: switch it on and paste the client ID and secret.

The Google button shows up on the sign-in page by itself.

### Email sign-in for everyone

Supabase's built-in email sender only reaches members of the Supabase team, a few times an hour. Add your own SMTP server under Supabase → Authentication → Emails → SMTP settings.

### Google Sheets

1. In the same Google Cloud project, enable the **Google Sheets API**.
2. Add authorized redirect URIs `https://catch-box.vercel.app/oauth/google-sheets/return` and `http://localhost:8080/oauth/google-sheets/return` to the OAuth client.
3. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` on Vercel, then redeploy.

### AI suggestions

On Vercel, AI suggestions sign in to AI Gateway with the deployment's own OIDC token. Vercel serves AI Gateway requests only when the team has a card on file, which also unlocks the free monthly credits: Vercel → AI Gateway → add a card.
