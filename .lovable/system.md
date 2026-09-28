# Catchbox design system

Catchbox is calm, warm, and quick to read. It gives people a clear place to notice problems, review evidence, and confidently take action. Use plain, friendly language: prefer “Needs a quick look” to operational jargon, and sentence case to title case.

## Setup

This is a local React and Tailwind CSS v4 library. After attaching it, import the canonical stylesheet once from `@/design-system/catchbox/styles.css` in the consumer's app stylesheet. The sheet contains both the Tailwind theme mapping and the semantic light and dark token values. Never import only a flat list of variables: utilities such as `bg-primary` need the `@theme` mapping. Import components from `@/design-system/catchbox` or from the matching component subpath. The library needs React, Radix primitives for its controls, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, and `zustand`.

Mount `useThemeSync()` once in a client-rendered root component. It reads the saved Catchbox theme after hydration and applies `.dark` or `.light` to the document element. `ThemeToggle` changes and persists the choice. Without that hook, consumers can still set the root class themselves to select a theme.

## Build with the system

Use semantic token utilities for all surface, text, border, and state colors, as in `<Button variant="default">Approve record</Button>` and `<p className="text-muted-foreground">Waiting for review</p>`. Prefer the exported button, badge, alert, form, and card components over parallel primitives. Use named `variant` and `size` options, not one-off styling flags. Use `cn()` to merge additional layout classes when composition needs them.

Keep focus indicators visible and name icon-only controls. Associate each form label with its field. Every interactive element must be keyboard reachable. Honor reduced-motion preferences for motion you introduce. Never let decorative styling imply that an unreviewed result is approved.

Do not copy literal token values into components, build an app screen into this library, import Catchbox's scraper backend, or show a raw private key in a demo. Token names and component APIs are documented in the generated design-system references; this file intentionally contains no duplicate token table.
