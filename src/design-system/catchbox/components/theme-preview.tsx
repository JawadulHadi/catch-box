import { cn } from "../lib/utils";
import type { ThemeSelection } from "../lib/themes";
import { CatchboxMark } from "./catchbox-mark";
import { ThemeScope } from "./theme-scope";

export type ThemePreviewProps = ThemeSelection & { className?: string };

/**
 * A miniature Catchbox screen drawn in a given theme: a sidebar, an inbox card
 * with its Approve action, and the page behind them. Decorative — label the
 * control that contains it.
 */
export function ThemePreview({ mode, accent, surface, className }: ThemePreviewProps) {
  return (
    <ThemeScope
      mode={mode}
      accent={accent}
      surface={surface}
      aria-hidden="true"
      className={cn("flex overflow-hidden rounded-lg border border-border", className)}
    >
      <div className="glass w-1/5 min-w-6 shrink-0 border-r border-sidebar-border bg-sidebar p-1.5">
        <CatchboxMark className="size-3.5" />
        <div className="mt-2 h-1 w-full rounded-full bg-primary/70" />
        <div className="mt-1 h-1 w-3/4 rounded-full bg-muted-foreground/30" />
        <div className="mt-1 h-1 w-2/3 rounded-full bg-muted-foreground/30" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5 p-2">
        <div className="glass rounded-md border border-border bg-card p-1.5 shadow-sm">
          <div className="h-1.5 w-3/5 rounded-full bg-foreground/80" />
          <div className="mt-1 h-1 w-4/5 rounded-full bg-muted-foreground/40" />
          <div className="mt-1.5 flex items-center gap-1">
            <div className="h-2 w-1/3 rounded-full bg-primary" />
            <div className="h-2 w-1/5 rounded-full border border-border" />
          </div>
        </div>
        <div className="glass rounded-md border border-border bg-card p-1.5">
          <div className="h-1 w-2/3 rounded-full bg-muted-foreground/40" />
        </div>
      </div>
    </ThemeScope>
  );
}
