# Data Guardian — Guidelines

## Components

The design system exports these components — import them from `@ws-dd22e65cc6700b88943b/c4381d79-f48e-441b-be8a-8791ccc5f1fb` and compose them before building anything from scratch:

`AppShell`, `Badge`, `Button`, `CardContent`, `CardDescription`, `CardFooter`, `CardHeader`, `CardTitle`, `Card`, `CatchboxMark`, `Constants`, `ReasonBadge`, `SheetsConnect`, `ThemeToggle`

Per-component details (import stanzas, props, variants, examples) live in `.lovable/rules/libraries/{slug}/components.md` — on disk, not auto-loaded. Read that file or the component source when the name alone isn't enough.

## Theme Files

The design system's theme is delivered through the following files. The author's original source files carry the full wiring the design system needs — variable declarations, framework-specific directives, provider objects, etc. — and are the canonical import target.

- `@ws-dd22e65cc6700b88943b/c4381d79-f48e-441b-be8a-8791ccc5f1fb/styles.css` (source — preferred import)
- `@ws-dd22e65cc6700b88943b/c4381d79-f48e-441b-be8a-8791ccc5f1fb/dist/tokens.css` (auto-generated flat list of CSS custom properties — a raw-values fallback only; does NOT carry framework-specific wiring that the source files above provide)

