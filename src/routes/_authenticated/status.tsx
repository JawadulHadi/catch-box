import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { AppShell } from "@/components/app-shell";
import { Card } from "@/design-system/catchbox/components/card";
import { Skeleton } from "@/design-system/catchbox/components/skeleton";
import { fetchScraperStatus } from "@/lib/catchbox-service";
import { formatDate, timeAgo } from "@/lib/format";

const description =
  "Each scraper's last run and how many records it has sent into your Google Sheet.";

export const Route = createFileRoute("/_authenticated/status")({
  head: () => ({
    meta: [
      { title: "Live status — Catchbox" },
      { name: "description", content: description },
      { property: "og:title", content: "Live status — Catchbox" },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: StatusPage,
});

function StatusPage() {
  const { data, isPending, error } = useQuery({
    queryKey: ["scraper-status"],
    queryFn: fetchScraperStatus,
    refetchInterval: 15000,
  });

  return (
    <AppShell title="Live status" subtitle="Refreshes by itself every 15 seconds.">
      {error ? (
        <Card className="border-destructive/40 bg-destructive/10 p-6 text-sm">
          We couldn't load the status. Please refresh and try again.
        </Card>
      ) : isPending ? (
        <Skeleton className="h-48 w-full rounded-xl" />
      ) : (
        <>
          <Card className="mb-6 p-5 text-sm">
            {data.sheetUrl ? (
              <p>
                Your Google Sheet was last updated{" "}
                <span className="font-medium">
                  {data.sheetSyncedAt ? timeAgo(data.sheetSyncedAt) : "not yet"}
                </span>
                .{" "}
                <a
                  href={data.sheetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary underline"
                >
                  Open sheet
                </a>
              </p>
            ) : (
              <p className="text-muted-foreground">
                Google Sheets isn't connected yet — the counts below are what will go into it once
                you connect it on Approved data.
              </p>
            )}
          </Card>
          {data.sites.length === 0 ? (
            <Card className="p-10 text-center text-sm text-muted-foreground">
              No scrapers have run yet.
            </Card>
          ) : (
            <Card className="overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="p-4 font-medium">Site</th>
                    <th className="p-4 font-medium">Last run</th>
                    <th className="p-4 font-medium">Last clean run</th>
                    <th className="p-4 font-medium">Records in the sheet</th>
                    <th className="p-4 font-medium">Trouble so far</th>
                  </tr>
                </thead>
                <tbody>
                  {data.sites.map((s) => (
                    <tr key={s.site} className="border-b border-border last:border-0">
                      <td className="p-4 font-medium">{s.site}</td>
                      <td className="p-4">{s.lastRunAt ? timeAgo(s.lastRunAt) : "Never"}</td>
                      <td className="p-4">{s.lastSuccessAt ? formatDate(s.lastSuccessAt) : "—"}</td>
                      <td className="p-4 font-mono">{s.approvedCount.toLocaleString("de-DE")}</td>
                      <td className="p-4 font-mono">{s.failureCount.toLocaleString("de-DE")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </>
      )}
    </AppShell>
  );
}
