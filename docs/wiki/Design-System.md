# Design system

The Catchbox design system lives entirely in `src/design-system/catchbox/`, so it can be copied into another React + Tailwind v4 project as it is. Everything it exports is also re-exported from `src/index.ts`. The full guide is in [`src/design-system/catchbox/README.md`](https://github.com/JawadulHadi/catch-box/blob/main/src/design-system/catchbox/README.md); see every piece live at <https://catch-box.vercel.app/showcase>.

## Setup

1. Import `src/design-system/catchbox/styles.css` once from your app stylesheet. It holds the Tailwind theme mapping, the bundled fonts (Space Grotesk, IBM Plex Sans, IBM Plex Mono) and every token.
2. Mount `useThemeSync()` once in a client-rendered root.
3. Inline `themeInitScript` in the document `<head>`, and put `suppressHydrationWarning` on `<html>`, so the saved theme applies before the first paint.

## Components

`Button`, `Badge`, `Card`, `Alert`, `Input`, `Textarea`, `Label`, `Tabs`, `Checkbox`, `Switch`, `Progress`, `Skeleton`, `CatchboxMark`, `ThemeToggle`, `ThemePicker`, `ThemePreview` and `ThemeScope`, plus the `cn()` helper.

## Themes

A theme is three independent choices, set together on one element:

| Choice  | How                 | Options                                                    |
| ------- | ------------------- | ---------------------------------------------------------- |
| Mode    | `.dark` or `.light` | dark (default), light                                      |
| Accent  | `data-accent="…"`   | `amber` (default), `blue`, `violet`, `magenta`, `graphite` |
| Surface | `data-surface="…"`  | `solid` (default), `glass`                                 |

```text
<html class="dark" data-accent="blue" data-surface="glass">
```

Children follow the nearest element that sets a theme, so `ThemeScope` can show one theme inside another.

- **Glass:** surface tokens turn translucent and the page shows the "catchlight" glow built from the accent. `Card` frosts by itself; for your own panels use `bg-card glass` (or `bg-sidebar glass`, `bg-popover glass`).
- **Meaning never changes:** accents change only the primary, ring and accent tokens. Success, warning and destructive look the same in every theme.
- **Accessibility:** every text color reaches 4.5:1 contrast, and glass turns solid when the system asks for reduced transparency.

## Rules

- Use semantic tokens (`bg-card`, `text-primary`, `text-muted-foreground`), never literal colors.
- Keep product screens and backend code out of the design-system folder and out of the `src/index.ts` barrel.
- Name icon-only controls, keep focus rings visible, and respect reduced motion.
