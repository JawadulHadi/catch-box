# Catchbox design system

Catchbox is calm, warm, and quick to read. It gives people a clear place to notice problems, review evidence, and confidently take action. Use plain, friendly language: prefer “Needs a quick look” to operational jargon, and sentence case to title case.

## Setup

This is a local React and Tailwind CSS v4 library that lives entirely in this folder, so it can be copied into another project as-is. Import the canonical stylesheet once from `@/design-system/catchbox/styles.css` in the consumer's app stylesheet. The sheet contains the Tailwind theme mapping, bundled display/body/mono fonts, and semantic light and dark token values. Never import only a flat list of variables: utilities such as `bg-primary` need the `@theme` mapping. Import components from `@/design-system/catchbox` or from the matching component subpath. The library needs React, Radix primitives for its controls, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, and `zustand`.

Mount `useThemeSync()` once in a client-rendered root component. It reads the saved Catchbox theme after hydration and applies it to the document element. Inline `themeInitScript` in the document `<head>` (with `suppressHydrationWarning` on `<html>`) so a saved theme is on the page before first paint. `ThemeToggle` flips light and dark; `ThemePicker` offers the featured combinations plus mode, accent and surface. Without the hook, consumers can set the attributes themselves.

A theme is three choices on one element: the `.dark` or `.light` class, `data-accent` (`amber`, `blue`, `violet`, `magenta`, `graphite`) and `data-surface` (`solid` or `glass`). Set all three together. Any element can carry its own theme and its children follow it; `ThemeScope` does this for previews. In glass themes, surface tokens turn translucent and the page shows a catchlight glow built from the accent. `Card` frosts automatically; give any other panel `bg-card glass` (or `bg-sidebar glass`, `bg-popover glass`). Use `bg-canvas` for a full-bleed area that should show the theme's background. Accents change only the primary, ring and accent tokens, never success, warning or destructive.

## Build with the system

Use semantic token utilities for all surface, text, border, and state colors, as in `<Button variant="default">Approve record</Button>` and `<p className="text-muted-foreground">Waiting for review</p>`. Prefer the exported button, badge, alert, form, and card components over parallel primitives. Use named `variant` and `size` options, not one-off styling flags. Use `cn()` to merge additional layout classes when composition needs them.

Keep focus indicators visible and name icon-only controls. Associate each form label with its field. Every interactive element must be keyboard reachable. Honor reduced-motion preferences for motion you introduce. Never let decorative styling imply that an unreviewed result is approved.

Do not copy literal token values into components, build an app screen into this library, import Catchbox's scraper backend, or show a raw private key in a demo. Token names and component APIs are documented in the generated design-system references; this file intentionally contains no duplicate token table.
