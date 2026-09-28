import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { AppShell } from "@/components/app-shell";
import { Card } from "@/design-system/catchbox/components/card";
import { Skeleton } from "@/design-system/catchbox/components/skeleton";
import { fetchScraperHistory, type RunPoint } from "@/lib/catchbox-service";
import { formatDate } from "@/lib/format";
import { cn } from "@/design-system/catchbox/lib/utils";

const description = "How each scraper has done over the last 30 days: every run, how often it worked, and what reached your sheet.";

export const Route = createFileRoute("/_authenticated/history")({
  head: () => ({
    meta: [
      { title: "Scraper history — Catchbox" },
      { name: "description", content: description },
      { property: "og:title", content: "Scraper history — Catchbox" },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HistoryPage,
});

const numberFormat = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 });

function formatDuration(ms: number | null): string {
  if (ms === null) return "—";
  return ms < 1000 ? `${Math.round(ms)} ms` : `${numberFormat.format(ms / 1000)} s`;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${formatDate(iso)} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function RunStrip({ runs }: { runs: RunPoint[] }) {
  const recent = runs.slice(-40);
  if (recent.length === 0) return <p className="text-xs text-muted-foreground">No runs in the last 30 days.</p>;
  return (
    <div className="flex h-8 items-end gap-1" aria-label="Recent runs, oldest to newest">
      {recent.map((run) => (
        <span
          key={run.ranAt}
          title={`${formatTime(run.ranAt)} — ${run.outcome === "approved" ? "worked" : "needed a look"}`}
          className={cn("w-2 rounded-sm", run.outcome === "approved" ? "h-8 bg-success" : "h-4 bg-destructive")}
        />
      ))}
    </div>
  );
}

function HistoryPage() {
  const { data, isPending, error } = useQuery({ queryKey: ["scraper-history"], queryFn: fetchScraperHistory });

  return (
    <AppShell title="Scraper history" subtitle="The last 30 days for each site. Tall green bars worked; short red bars needed a look.">
      {error ? (
        <Card className="border-destructive/40 bg-destructive/10 p-6 text-sm">
          We couldn't load the history. Please refresh and try again.
        </Card>
      ) : isPending ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[0, 1].map((k) => <Skeleton key={k} className="h-48 w-full rounded-xl" />)}
        </div>
      ) : data.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          No history yet — it starts filling in from your next scraper run.
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {data.map((s) => (
            <Card key={s.site} className="p-6">
              <h2 className="font-display text-lg font-semibold">{s.site}</h2>
              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Stat label="Runs" value={numberFormat.format(s.totalRuns)} />
                <Stat label="Worked" value={s.successRate === null ? "—" : `${numberFormat.format(s.successRate * 100)} %`} />
                <Stat label="Avg. run time" value={formatDuration(s.avgDurationMs)} />
                <Stat label="In the sheet" value={numberFormat.format(s.approvedCount)} />
              </div>
              <div className="mt-5">
                <RunStrip runs={s.runs} />
              </div>
              {s.runs.length > 0 ? (
                <ul className="mt-4 space-y-1 text-xs text-muted-foreground">
                  {s.runs.slice(-5).reverse().map((run) => (
                    <li key={run.ranAt} className="flex justify-between gap-2">
                      <span>{formatTime(run.ranAt)}</span>
                      <span>{run.outcome === "approved" ? "Worked" : "Needed a look"} · {formatDuration(run.durationMs)}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </Card>
          ))}
        </div>
      )}
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-display text-xl font-semibold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
