import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { AppShell } from "@/components/app-shell";
import { Card } from "@/design-system/catchbox/components/card";
import { Button } from "@/design-system/catchbox/components/button";
import { Badge } from "@/design-system/catchbox/components/badge";
import { Skeleton } from "@/design-system/catchbox/components/skeleton";
import { fetchRecentAlerts, fetchScrapers } from "@/lib/catchbox-service";
import { timeAgo } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/scrapers")({
  head: () => ({
    meta: [
      { title: "Your scrapers — Catchbox" },
      {
        name: "description",
        content: "The sites you're watching and how often each one runs into trouble.",
      },
      { property: "og:title", content: "Your scrapers — Catchbox" },
      {
        property: "og:description",
        content: "The sites you're watching and how often each one runs into trouble.",
      },
    ],
  }),
  component: ScrapersPage,
});

function healthLabel(failures: number): { text: string; className: string } {
  if (failures === 0) {
    return { text: "Running smoothly", className: "border-success/40 bg-success/10 text-success" };
  }
  if (failures < 3) {
    return { text: "A few hiccups", className: "border-warning/40 bg-warning/10 text-warning" };
  }
  return { text: "Needs attention", className: "border-destructive/40 bg-destructive/10 text-destructive" };
}

function ScrapersPage() {
  const { data, isPending, error } = useQuery({
    queryKey: ["scrapers"],
    queryFn: fetchScrapers,
  });
  const { data: alerts } = useQuery({ queryKey: ["scraper-alerts"], queryFn: fetchRecentAlerts });

  return (
    <AppShell
      title="Your scrapers"
      subtitle="The sites you're watching, how often each one is running into trouble, and when it last did."
    >
      {alerts && alerts.length > 0 ? (
        <Card className="mb-6 border-warning/40 bg-warning/10 p-5 text-sm">
          <h2 className="font-semibold">Worth a look today</h2>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            {alerts.map((alert) => (
              <li key={alert.id}>
                <span className="font-medium text-foreground">{alert.site}</span> failed{" "}
                {alert.failures_in_window} times in the last day.
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
      {error ? (
        <Card className="border-destructive/40 bg-destructive/10 p-6 text-sm">
          We couldn't load your scrapers. Please refresh and try again.
        </Card>
      ) : isPending ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[0, 1, 2, 3].map((key) => (
            <Skeleton key={key} className="h-36 w-full rounded-xl" />
          ))}
        </div>
      ) : (data?.length ?? 0) === 0 ? (
        <Card className="border-border bg-card p-10 text-center">
          <h2 className="text-lg font-semibold">No scrapers yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            A site shows up here the first time one of your scrapers sends something in.
          </p>
          <Button asChild variant="outline" className="mt-6">
            <Link to="/connect">Connect your scraper</Link>
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {data.map((scraper) => {
            const health = healthLabel(scraper.failure_count);
            return (
              <Card key={scraper.id} className="border-border bg-card p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-lg font-semibold">{scraper.site}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Runs: {scraper.schedule.toLowerCase()}
                    </p>
                  </div>
                  <Badge variant="outline" className={`font-normal ${health.className}`}>
                    {health.text}
                  </Badge>
                </div>
                <div className="mt-6 flex items-end gap-8">
                  <div>
                    <p className="font-display text-2xl font-semibold">{scraper.failure_count}</p>
                    <p className="text-xs text-muted-foreground">
                      {scraper.failure_count === 1 ? "time it got stuck" : "times it got stuck"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm">{timeAgo(scraper.last_failure_at)}</p>
                    <p className="text-xs text-muted-foreground">last trouble</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
