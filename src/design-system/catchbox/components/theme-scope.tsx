import * as React from "react";

import { cn } from "../lib/utils";
import { themeAttributes, type ThemeSelection } from "../lib/themes";

export type ThemeScopeProps = React.HTMLAttributes<HTMLDivElement> & ThemeSelection;

/**
 * Renders its children in a theme of their own, whatever the page uses — for
 * previews and side-by-side comparisons. Paints the theme's background and, in
 * glass themes, its catchlight.
 */
export const ThemeScope = React.forwardRef<HTMLDivElement, ThemeScopeProps>(function ThemeScope(
  { mode, accent, surface, className, ...props },
  ref,
) {
  const { className: modeClass, ...attributes } = themeAttributes({ mode, accent, surface });
  return (
    <div
      ref={ref}
      {...attributes}
      className={cn(modeClass, "bg-canvas text-foreground", className)}
      {...props}
    />
  );
});
