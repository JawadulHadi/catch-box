# Catchbox design system library

## Goal
Turn Catchbox’s light and dark themes, semantic colors, typography, buttons, and supporting controls into a reusable library while keeping the current Catchbox app and showcase working.

## What will change
- Create one self-contained design-system folder containing the theme, shared utility, brand mark, theme control, and reusable form/content components.
- Re-export the public library surface from `src/index.ts`, with typed component APIs suitable for attached projects.
- Point the existing app and showcase at the packaged components so the live Catchbox product remains the visual test for the library.
- Update the library classification, source extraction, consumer guidance, and preview-only exclusions required for publishing and attaching.
- Enrich the design-system catalog with usage examples and antipattern guidance for each exported component.
- Verify the existing app, light/dark theme switching, and showcase in desktop and narrow layouts.

## Public library scope
- Catchbox semantic light and dark themes and typography
- Theme provider/hook and theme toggle
- Button, badge, card, alert, input, textarea, label, tabs, checkbox, switch, progress, and skeleton
- Catchbox brand mark and shared class-name utility

## Technical details
- The reusable source will live entirely under `src/design-system/catchbox/` so file-copy attach cannot leave imports behind.
- `src/design-system/catchbox/styles.css` will be the canonical Tailwind v4 theme entry.
- The app-level stylesheet will import that theme entry; consumers can import the same file.
- Preview routes, product-specific screens, backend integrations, and app navigation remain outside the published library.
- The project will be classified as a local React/Tailwind design system using the stack-neutral custom design-system starter.
