import { Moon, Sun } from "lucide-react";

import { Button } from "./button";
import { useThemeStore } from "../hooks/use-theme";

export function ThemeToggle({ className }: { className?: string }) {
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const next = theme === "dark" ? "light" : "dark";
  return (
    <Button
      variant="ghost"
      size="sm"
      className={className}
      onClick={() => setTheme(next)}
      aria-label={`Switch to ${next} theme`}
    >
      {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
      {theme === "dark" ? "Light theme" : "Dark theme"}
    </Button>
  );
}
