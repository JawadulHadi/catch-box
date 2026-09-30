import * as React from "react";
import { Check, Layers, Moon, Square, Sun, type LucideIcon } from "lucide-react";

import { cn } from "../lib/utils";
import {
  isSameTheme,
  themeAccents,
  themeAttributes,
  themePresets,
  type ThemeMode,
  type ThemePreset,
  type ThemeSurface,
} from "../lib/themes";
import { useThemeSelection, useThemeStore } from "../hooks/use-theme";
import { ThemePreview } from "./theme-preview";

export type ThemePickerProps = {
  className?: string;
  /** Featured combinations shown as previews. Defaults to Catchbox's own. */
  presets?: readonly ThemePreset[];
};

const modeOptions: readonly { value: ThemeMode; label: string; icon: LucideIcon }[] = [
  { value: "dark", label: "Dark", icon: Moon },
  { value: "light", label: "Light", icon: Sun },
];

const surfaceOptions: readonly { value: ThemeSurface; label: string; icon: LucideIcon }[] = [
  { value: "solid", label: "Solid", icon: Square },
  { value: "glass", label: "Glass", icon: Layers },
];

const labelClass = "text-xs font-medium text-muted-foreground";

function Segmented<T extends string>({
  legend,
  name,
  value,
  options,
  onChange,
}: {
  legend: string;
  name: string;
  value: T;
  options: readonly { value: T; label: string; icon: LucideIcon }[];
  onChange: (value: T) => void;
}) {
  return (
    <fieldset>
      <legend className={labelClass}>{legend}</legend>
      <div className="mt-2 grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
        {options.map((option) => (
          <label
            key={option.value}
            className="flex cursor-pointer items-center justify-center gap-2 rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground has-[:checked]:bg-background has-[:checked]:font-medium has-[:checked]:text-foreground has-[:checked]:shadow-sm has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            <option.icon className="size-4" aria-hidden="true" />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/**
 * Lets people choose how Catchbox looks: a featured combination, or their own mix
 * of mode, accent and surface. Changes apply at once and are remembered.
 * Needs `useThemeSync()` mounted in the app root.
 */
export function ThemePicker({ className, presets = themePresets }: ThemePickerProps) {
  const id = React.useId();
  const selection = useThemeSelection();
  const setSelection = useThemeStore((s) => s.setSelection);
  const setTheme = useThemeStore((s) => s.setTheme);
  const setAccent = useThemeStore((s) => s.setAccent);
  const setSurface = useThemeStore((s) => s.setSurface);
  const accentLabel = themeAccents.find((a) => a.value === selection.accent)?.label;

  return (
    <div className={cn("space-y-5", className)}>
      {presets.length > 0 ? (
        <div>
          <p id={`${id}-featured`} className={labelClass}>
            Featured
          </p>
          <div
            role="group"
            aria-labelledby={`${id}-featured`}
            className="mt-2 grid grid-cols-2 gap-2"
          >
            {presets.map((preset) => {
              const active = isSameTheme(preset, selection);
              return (
                <button
                  key={preset.id}
                  type="button"
                  aria-pressed={active}
                  aria-describedby={`${id}-${preset.id}`}
                  title={preset.description}
                  onClick={() => setSelection(preset)}
                  className={cn(
                    "flex cursor-pointer flex-col rounded-lg p-1 text-left outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring",
                    active && "bg-accent ring-1 ring-primary",
                  )}
                >
                  <ThemePreview
                    mode={preset.mode}
                    accent={preset.accent}
                    surface={preset.surface}
                    className="h-16 w-full"
                  />
                  <span className="mt-1.5 flex items-center justify-between gap-1 px-0.5 text-xs font-medium">
                    {preset.name}
                    {active ? <Check className="size-3.5 text-primary" aria-hidden="true" /> : null}
                  </span>
                  <span id={`${id}-${preset.id}`} className="sr-only">
                    {preset.description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <Segmented
        legend="Mode"
        name={`${id}-mode`}
        value={selection.mode}
        options={modeOptions}
        onChange={setTheme}
      />

      <fieldset>
        <legend className={labelClass}>
          Accent <span className="text-foreground">· {accentLabel}</span>
        </legend>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {themeAccents.map((accent) => {
            const { className: modeClass, ...scope } = themeAttributes({
              ...selection,
              accent: accent.value,
            });
            return (
              <label
                key={accent.value}
                title={accent.label}
                className="cursor-pointer rounded-full p-1 transition-colors hover:bg-accent has-[:checked]:ring-2 has-[:checked]:ring-foreground has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
              >
                <input
                  type="radio"
                  name={`${id}-accent`}
                  value={accent.value}
                  checked={selection.accent === accent.value}
                  onChange={() => setAccent(accent.value)}
                  className="sr-only"
                />
                {/* The swatch reads the accent's own primary token rather than a copied value. */}
                <span
                  {...scope}
                  aria-hidden="true"
                  className={cn(
                    modeClass,
                    "block size-6 rounded-full border border-border bg-primary",
                  )}
                />
                <span className="sr-only">{accent.label}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <Segmented
        legend="Surface"
        name={`${id}-surface`}
        value={selection.surface}
        options={surfaceOptions}
        onChange={setSurface}
      />
    </div>
  );
}
