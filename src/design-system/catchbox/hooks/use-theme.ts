import { useEffect } from "react";
import { create } from "zustand";

export type Theme = "dark" | "light";

type ThemeState = { theme: Theme; setTheme: (theme: Theme) => void };

const storageKey = "catchbox-theme";

export const useThemeStore = create<ThemeState>((set) => ({
  theme: "dark",
  setTheme: (theme) => {
    window.localStorage.setItem(storageKey, theme);
    set({ theme });
  },
}));

/** Reads the saved theme after hydration and keeps the page's class in sync. */
export function useThemeSync(): void {
  const theme = useThemeStore((s) => s.theme);
  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);
    if (saved === "light" || saved === "dark") useThemeStore.setState({ theme: saved });
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light");
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);
}
