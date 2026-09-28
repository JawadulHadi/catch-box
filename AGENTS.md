<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep the reusable Catchbox design system self-contained under `src/design-system/catchbox/` and re-export it from `src/index.ts`; attached projects copy only this source subtree.
- Use `src/design-system/catchbox/styles.css` as the canonical Tailwind v4 theme entry; the app stylesheet imports it so preview and consumers share one source of truth.
- Keep Catchbox product routes, backend integrations, and app-only components outside the library barrel; attached projects must not inherit product behavior.
