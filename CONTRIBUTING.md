# Contributing to Catchbox

Thanks for helping make scrapers less painful. Please read the [code of conduct](./CODE_OF_CONDUCT.md) first.

## Getting set up

1. Install [Bun](https://bun.sh).
2. Run `bun install`, then `bun run dev`.
3. Open http://localhost:8080 and sign in with Google.

## Making a change

1. Create a branch named after what you're doing, for example `fix-csv-dates`.
2. Keep each change small and focused on one thing.
3. Run `bun run lint` before you open a pull request.
4. Describe what changed and why, in plain words.

## House rules for code

- TypeScript strict mode, no `any` — use `unknown` and narrow it.
- Named exports only, kebab-case file names, PascalCase components.
- Style with Tailwind and shadcn/ui; no inline styles or CSS modules.
- Server state goes through React Query and the service layer in `src/lib`, never raw `fetch` in components.
- Dates show as DD/MM/YYYY.
- User-facing copy is warm, plain, and in sentence case.

## Reporting bugs

Open an issue with what you did, what you expected, and what happened instead. For security problems, follow [SECURITY.md](./SECURITY.md) instead.
