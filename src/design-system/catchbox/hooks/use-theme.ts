import { useEffect } from "react";
import { create } from "zustand";

import {
  applyThemeToElement,
  defaultThemeSelection,
  readStoredTheme,
  writeStoredTheme,
  type ThemeAccent,
  type ThemeMode,
  type ThemeSelection,
  type ThemeSurface,
} from "../lib/themes";

/** Light or dark. Kept as `Theme` for existing consumers; see `ThemeSelection` for the full choice. */
export type Theme = ThemeMode;

type ThemeState = {
  /** The mode, named `theme` for backward compatibility. */
  theme: ThemeMode;
  accent: ThemeAccent;
  surface: ThemeSurface;
  /** False until the saved theme has been read after hydration. */
  hydrated: boolean;
  setTheme: (theme: ThemeMode) => void;
  setAccent: (accent: ThemeAccent) => void;
  setSurface: (surface: ThemeSurface) => void;
  setSelection: (selection: ThemeSelection) => void;
};

function selectionOf(state: Pick<ThemeState, "theme" | "accent" | "surface">): ThemeSelection {
  return { mode: state.theme, accent: state.accent, surface: state.surface };
}

export const useThemeStore = create<ThemeState>((set, get) => {
  function update(next: ThemeSelection) {
    writeStoredTheme(next);
    set({ theme: next.mode, accent: next.accent, surface: next.surface });
  }
  return {
    theme: defaultThemeSelection.mode,
    accent: defaultThemeSelection.accent,
    surface: defaultThemeSelection.surface,
    hydrated: false,
    setTheme: (theme) => update({ ...selectionOf(get()), mode: theme }),
    setAccent: (accent) => update({ ...selectionOf(get()), accent }),
    setSurface: (surface) => update({ ...selectionOf(get()), surface }),
    setSelection: (selection) => update(selection),
  };
});

/** The current theme as one object. */
export function useThemeSelection(): ThemeSelection {
  const mode = useThemeStore((s) => s.theme);
  const accent = useThemeStore((s) => s.accent);
  const surface = useThemeStore((s) => s.surface);
  return { mode, accent, surface };
}

/**
 * Mount once in a client-rendered root. Reads the saved theme after hydration and
 * keeps the document root's class and data attributes in sync with the store.
 */
export function useThemeSync(): void {
  const { mode, accent, surface } = useThemeSelection();
  const hydrated = useThemeStore((s) => s.hydrated);

  useEffect(() => {
    const saved = readStoredTheme();
    useThemeStore.setState({
      theme: saved.mode,
      accent: saved.accent,
      surface: saved.surface,
      hydrated: true,
    });
  }, []);

  useEffect(() => {
    // Before hydration the store still holds the defaults; applying them would undo
    // whatever `themeInitScript` already put on the page.
    if (!hydrated) return;
    applyThemeToElement(document.documentElement, { mode, accent, surface });
  }, [hydrated, mode, accent, surface]);
}
