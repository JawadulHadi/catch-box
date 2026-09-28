import { Moon, Sun } from "lucide-react";
import * as React from "react";

import { Button } from "./button";
import { useThemeStore } from "../hooks/use-theme";

export interface ThemeToggleProps extends Omit<React.ComponentProps<typeof Button>, "children" | "variant" | "size" | "asChild"> {}

export const ThemeToggle = React.forwardRef<HTMLButtonElement, ThemeToggleProps>(function ThemeToggle({ className, onClick, ...props }, ref) {
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const next = theme === "dark" ? "light" : "dark";
  return (
    <Button
      variant="ghost"
      size="sm"
      ref={ref}
      className={className}
      onClick={(event) => { setTheme(next); onClick?.(event); }}
      aria-label={`Switch to ${next} theme`}
      {...props}
    >
      {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
      {theme === "dark" ? "Light theme" : "Dark theme"}
    </Button>
  );
});
