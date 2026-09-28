import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Inbox } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { ReasonBadge } from "@/components/reason-badge";
import { Card } from "@/design-system/catchbox/components/card";
import { Button } from "@/design-system/catchbox/components/button";
import { Skeleton } from "@/design-system/catchbox/components/skeleton";
import { fetchCatches, seedExamples } from "@/lib/catchbox-service";
import { shortUrl, timeAgo } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/queue")({
  head: () => ({
    meta: [
      { title: "Things that need a quick look — Catchbox" },
      {
        name: "description",
        content: "Every scrape that got stuck, newest first, with a one-line reason why.",
      },
      { property: "og:title", content: "Things that need a quick look — Catchbox" },
      {
        property: "og:description",
        content: "Every scrape that got stuck, newest first, with a one-line reason why.",
      },
    ],
  }),
  component: QueuePage,
});

function QueuePage() {
  const { data, isPending, error } = useQuery({
    queryKey: ["catches", "pending"],
    queryFn: async () => {
      await seedExamples();
      return fetchCatches("pending");
    },
  });

  const waiting = data?.length ?? 0;

  return (
    <AppShell
      title="Things that need a quick look"
      subtitle="Each one is a scrape that got stuck. Open it, fill in what's missing, and approve it — newest first."
      actions={
        <div className="rounded-lg border border-border bg-card px-4 py-3 text-sm">
          <span className="font-display text-xl font-semibold text-primary">{waiting}</span>{" "}
          <span className="text-muted-foreground">waiting</span>
        </div>
      }
    >
      {error ? (
        <Card className="border-destructive/40 bg-destructive/10 p-6 text-sm">
          We couldn't load your inbox just now. Please refresh the page and try again.
        </Card>
      ) : isPending ? (
        <div className="space-y-3">
          {[0, 1, 2].map((key) => (
            <Skeleton key={key} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : waiting === 0 ? (
        <Card className="border-border bg-card p-10 text-center">
          <Inbox className="mx-auto size-8 text-primary" />
          <h2 className="mt-4 text-lg font-semibold">Nothing needs you right now</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Every scrape is going through cleanly. When one gets stuck, it will show up here.
          </p>
          <Button asChild variant="outline" className="mt-6">
            <Link to="/connect">Connect your scraper</Link>
          </Button>
        </Card>
      ) : (
        <ul className="space-y-3">
          {data.map((item) => (
            <li key={item.id}>
              <Link
                to="/fix/$id"
                params={{ id: item.id }}
                className="group block rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/50 hover:bg-surface"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <ReasonBadge reason={item.error_type} />
                      <span className="text-xs text-muted-foreground">
                        waiting {timeAgo(item.created_at)}
                      </span>
                    </div>
                    <p className="mt-3 font-display text-base font-medium">{item.site}</p>
                    <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
                      {shortUrl(item.url)}
                    </p>
                    {item.missing_fields.length > 0 ? (
                      <p className="mt-2 text-sm text-muted-foreground">
                        Missing: {item.missing_fields.join(", ")}
                      </p>
                    ) : null}
                  </div>
                  <span className="flex items-center gap-1 text-sm text-primary opacity-0 transition-opacity group-hover:opacity-100">
                    Fix it
                    <ArrowRight className="size-4" />
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
