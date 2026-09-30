# Troubleshooting

## Setup

**`npx supabase db push` says "Cannot find project ref. Have you run supabase link?"** The folder isn't linked to the Supabase project yet (the link isn't stored in git). Run `npx supabase link --project-ref xdoofqcilrozsiwxmomw` once, then push again.

**`db push` tries to re-run a migration that's already applied.** The file's timestamp doesn't match the version the database recorded. Compare with `npx supabase migration list` and rename the file to the recorded version.

**`node use 24` says "Cannot find module".** `node` runs files; switching versions is `nvm use 24`. Install first with `nvm install 24`.

**Lots of `EBADENGINE` warnings on install.** You're on Node 20. Catchbox needs Node 22.19 or later; use Node 24.

**Server calls fail with "native WebSocket not found".** Same cause: Node 20. Switch to Node 24.

**A `package-lock.json` appeared.** Something ran `npm install`. Delete `package-lock.json`, run `bun install`, and add packages with `bun add` from now on.

**The sign-in page says "Catchbox isn't connected to its database".** `VITE_SUPABASE_URL` or `VITE_SUPABASE_PUBLISHABLE_KEY` is empty. Fill in `.env` and restart `bun run dev`; on Vercel, set them and redeploy.

Run `bun run check-env` any time for a checklist.

## Signing in

**The Google button is missing.** Google isn't switched on in Supabase yet. See [Deployment → Google sign-in](Deployment.md#google-sign-in).

**The sign-in email never arrives.** Supabase's built-in sender only emails members of the Supabase team, a few times an hour. Add your own SMTP server (see [Deployment](Deployment.md#email-sign-in-for-everyone)).

**"That sign-in link has expired or was opened in a different browser."** Links work once, in the browser that asked for them. Ask for a new one.

**The link opens the wrong site (for example `localhost:3000`).** The address isn't in Supabase's allowed list. Add it to `supabase/config.toml` and push it (see [Deployment](Deployment.md#supabase-settings)).

## Features

**"AI suggestions are switched off until a card is added…"** Vercel AI Gateway needs a card on the team, which also unlocks the free credits. Add one under Vercel → AI Gateway.

**"AI suggestions aren't set up on this server yet"** on a local run. Run `vercel env pull .env.local` (the token lasts 12 hours) or set `AI_GATEWAY_API_KEY`.

**"Google Sheets isn't set up on this server yet."** Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` and `TOKEN_ENCRYPTION_KEY`. See [Deployment → Google Sheets](Deployment.md#google-sheets).

**The builder says "That address points to a private network".** The page, a redirect, or its DNS answer leads to a private address. Catchbox only opens public pages.

**A scraper gets `401 That key is not valid`.** The key was replaced, or it's copied wrong. Keys are shown only once; replace it on **Connect your scraper** and update the scraper.
