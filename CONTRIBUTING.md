# Contributing to Catchbox

Thanks for helping make scrapers less painful. Please read the [code of conduct](./CODE_OF_CONDUCT.md) first.

## Getting set up

1. Install [Bun](https://bun.sh) and Node.js 24 (22.19 or later works).
2. Copy `.env.example` to `.env` and fill it in, then run `bun run check-env`.
3. Run `bun install --frozen-lockfile`, then `bun run dev`.
4. Open <http://localhost:8080> and sign in with an email link (or Google, once it's switched on — see the [README](./README.md#sign-in)).

## Making a change

1. Create a branch named after what you're doing, for example `fix-csv-dates`.
2. Keep each change small and focused on one thing.
3. Run `bun run lint`, `bun run typecheck` and `bun run format` before you open a pull request. CI runs the same checks plus a build on every pull request.
4. If you add or upgrade a package, use `bun add` (not npm) and commit the updated `bun.lock` with it.
5. Database changes go in a new file under `supabase/migrations/`, followed by regenerated types (see `AGENTS.md`).
6. Update the docs that your change affects: `README.md`, the wiki in `docs/wiki`, and `CHANGELOG.md`.
7. Describe what changed and why, in plain words.

## House rules for code

- TypeScript strict mode, no `any` — use `unknown` and narrow it.
- Named exports only, kebab-case file names, PascalCase components.
- Style with Tailwind and shadcn/ui; no inline styles or CSS modules.
- Use theme tokens (`bg-card`, `text-primary`, …), never literal colors, so every theme works. Panels you build yourself need `bg-card glass` to frost in glass themes.
- Server state goes through React Query and the service layer in `src/lib`, never raw `fetch` in components.
- Dates show as DD/MM/YYYY.
- User-facing copy is warm, plain, and in sentence case.

## Reporting bugs

Open an issue with what you did, what you expected, and what happened instead. For security problems, follow [SECURITY.md](./SECURITY.md) instead.
