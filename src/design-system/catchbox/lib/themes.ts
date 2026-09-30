/**
 * Catchbox themes are three independent choices that combine freely:
 * - mode: `.dark` or `.light` class
 * - accent: `data-accent` attribute (the "catch" color)
 * - surface: `data-surface` attribute — solid panels or frosted glass
 *
 * Set all three on the same element. The document root carries the app's theme;
 * any other element can carry its own to show a scoped preview (see `ThemeScope`).
 */

export type ThemeMode = "dark" | "light";
export type ThemeAccent = "amber" | "blue" | "violet" | "magenta" | "graphite";
export type ThemeSurface = "solid" | "glass";

export type ThemeSelection = {
  mode: ThemeMode;
  accent: ThemeAccent;
  surface: ThemeSurface;
};

export type ThemePreset = ThemeSelection & {
  id: string;
  name: string;
  description: string;
};

export const themeModes: readonly { value: ThemeMode; label: string }[] = [
  { value: "dark", label: "Dark" },
  { value: "light", label: "Light" },
];

export const themeAccents: readonly { value: ThemeAccent; label: string }[] = [
  { value: "amber", label: "Amber" },
  { value: "blue", label: "Blue" },
  { value: "violet", label: "Violet" },
  { value: "magenta", label: "Magenta" },
  { value: "graphite", label: "Graphite" },
];

export const themeSurfaces: readonly { value: ThemeSurface; label: string }[] = [
  { value: "solid", label: "Solid" },
  { value: "glass", label: "Glass" },
];

export const defaultThemeSelection: ThemeSelection = {
  mode: "dark",
  accent: "amber",
  surface: "solid",
};

/** Hand-picked combinations. Every other combination is still available. */
export const themePresets: readonly ThemePreset[] = [
  {
    id: "classic",
    name: "Classic",
    description: "Solid dark ink with the amber catch. The original look.",
    ...defaultThemeSelection,
  },
  {
    id: "night-shift",
    name: "Night shift",
    description: "Amber light falling through frosted dark panels.",
    mode: "dark",
    accent: "amber",
    surface: "glass",
  },
  {
    id: "deep-water",
    name: "Deep water",
    description: "Cool blue glass that's easy on tired eyes.",
    mode: "dark",
    accent: "blue",
    surface: "glass",
  },
  {
    id: "violet-hour",
    name: "Violet hour",
    description: "Violet glass with a soft pink edge.",
    mode: "dark",
    accent: "violet",
    surface: "glass",
  },
  {
    id: "graphite",
    name: "Graphite",
    description: "No color at all, so only the data stands out.",
    mode: "dark",
    accent: "graphite",
    surface: "glass",
  },
  {
    id: "frosted-paper",
    name: "Frosted paper",
    description: "Warm paper behind clear, bright panels.",
    mode: "light",
    accent: "amber",
    surface: "glass",
  },
  {
    id: "clear-morning",
    name: "Clear morning",
    description: "Light blue glass, crisp and bright.",
    mode: "light",
    accent: "blue",
    surface: "glass",
  },
  {
    id: "orchid",
    name: "Orchid",
    description: "Light glass with a magenta glow.",
    mode: "light",
    accent: "magenta",
    surface: "glass",
  },
];

export const themeStorageKeys = {
  mode: "catchbox-theme",
  accent: "catchbox-accent",
  surface: "catchbox-surface",
} as const;

const modeValues = themeModes.map((m) => m.value);
const accentValues = themeAccents.map((a) => a.value);
const surfaceValues = themeSurfaces.map((s) => s.value);

function isOneOf<T extends string>(values: readonly T[], value: unknown): value is T {
  return typeof value === "string" && (values as readonly string[]).includes(value);
}

export function isSameTheme(a: ThemeSelection, b: ThemeSelection): boolean {
  return a.mode === b.mode && a.accent === b.accent && a.surface === b.surface;
}

export function findThemePreset(selection: ThemeSelection): ThemePreset | undefined {
  return themePresets.find((preset) => isSameTheme(preset, selection));
}

/** The class and data attributes that put an element (and its children) in a theme. */
export function themeAttributes(selection: ThemeSelection): {
  className: ThemeMode;
  "data-accent": ThemeAccent;
  "data-surface": ThemeSurface;
} {
  return {
    className: selection.mode,
    "data-accent": selection.accent,
    "data-surface": selection.surface,
  };
}

export function applyThemeToElement(element: HTMLElement, selection: ThemeSelection): void {
  element.classList.toggle("light", selection.mode === "light");
  element.classList.toggle("dark", selection.mode === "dark");
  element.dataset["accent"] = selection.accent;
  element.dataset["surface"] = selection.surface;
}

/** Reads the saved theme. Storage can be missing or blocked, so fall back to the default. */
export function readStoredTheme(): ThemeSelection {
  try {
    const mode = window.localStorage.getItem(themeStorageKeys.mode);
    const accent = window.localStorage.getItem(themeStorageKeys.accent);
    const surface = window.localStorage.getItem(themeStorageKeys.surface);
    return {
      mode: isOneOf(modeValues, mode) ? mode : defaultThemeSelection.mode,
      accent: isOneOf(accentValues, accent) ? accent : defaultThemeSelection.accent,
      surface: isOneOf(surfaceValues, surface) ? surface : defaultThemeSelection.surface,
    };
  } catch {
    return defaultThemeSelection;
  }
}

export function writeStoredTheme(selection: ThemeSelection): void {
  try {
    window.localStorage.setItem(themeStorageKeys.mode, selection.mode);
    window.localStorage.setItem(themeStorageKeys.accent, selection.accent);
    window.localStorage.setItem(themeStorageKeys.surface, selection.surface);
  } catch {
    // Private windows can block storage; the theme still applies for this visit.
  }
}

/**
 * Inline this in the document `<head>` so the saved theme is on the page before
 * first paint. Without it, a saved light or glass theme flashes dark on load.
 */
export const themeInitScript = `(function(){try{var d=document.documentElement,s=window.localStorage,k=${JSON.stringify(
  themeStorageKeys,
)},m=s.getItem(k.mode),a=s.getItem(k.accent),f=s.getItem(k.surface);if(${JSON.stringify(
  modeValues,
)}.indexOf(m)<0)m=${JSON.stringify(defaultThemeSelection.mode)};d.classList.remove("light","dark");d.classList.add(m);if(${JSON.stringify(
  accentValues,
)}.indexOf(a)>=0)d.setAttribute("data-accent",a);if(${JSON.stringify(
  surfaceValues,
)}.indexOf(f)>=0)d.setAttribute("data-surface",f)}catch(e){}})();`;
