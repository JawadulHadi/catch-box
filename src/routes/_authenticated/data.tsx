import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Download, Search } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SheetsConnect } from "@/components/sheets-connect";
import { fetchApproved } from "@/lib/catchbox-service";
import { downloadTextFile, formatDate, shortUrl, toCsv } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/data")({
  head: () => ({
    meta: [
      { title: "Approved data — Catchbox" },
      {
        name: "description",
        content: "Everything that's been checked by a person and is safe to use, ready to download.",
      },
      { property: "og:title", content: "Approved data — Catchbox" },
      {
        property: "og:description",
        content: "Everything that's been checked by a person and is safe to use.",
      },
    ],
  }),
  component: DataPage,
});

function DataPage() {
  const [search, setSearch] = useState("");
  const { data, isPending, error } = useQuery({
    queryKey: ["approved"],
    queryFn: fetchApproved,
  });

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!data) return [];
    if (!term) return data;
    return data.filter((row) =>
      `${row.site} ${row.url} ${JSON.stringify(row.data)}`.toLowerCase().includes(term),
    );
  }, [data, search]);

  const columns = useMemo(() => {
    const keys = new Set<string>();
    for (const row of rows) for (const key of Object.keys(row.data)) keys.add(key);
    return [...keys];
  }, [rows]);

  function handleDownload() {
    const flattened = rows.map((row) => ({
      site: row.site,
      url: row.url,
      approved_on: formatDate(row.extracted_at),
      ...row.data,
    }));
    const csvColumns = ["site", "url", "approved_on", ...columns];
    downloadTextFile("catchbox-approved-data.csv", toCsv(flattened, csvColumns));
  }

  return (
    <AppShell
      title="Approved data"
      subtitle="Everything a person has checked. Safe to use, safe to share, and yours to download."
      actions={
        <Button onClick={handleDownload} disabled={rows.length === 0} variant="outline">
          <Download className="size-4" />
          Download CSV
        </Button>
      }
    >
      <SheetsConnect />

      <div className="relative mb-6 max-w-sm">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search approved data"
          className="pl-9"
        />
      </div>

      {error ? (
        <Card className="border-destructive/40 bg-destructive/10 p-6 text-sm">
          We couldn't load your approved data. Please refresh and try again.
        </Card>
      ) : isPending ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : rows.length === 0 ? (
        <Card className="border-border bg-card p-10 text-center">
          <h2 className="text-lg font-semibold">
            {search ? "Nothing matches that search" : "No approved data yet"}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            {search
              ? "Try a different word, or clear the search to see everything."
              : "Once you approve something from your inbox, it lands here."}
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden border-border bg-card p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Site</TableHead>
                  <TableHead>Page</TableHead>
                  {columns.map((column) => (
                    <TableHead key={column}>{column.replace(/[_-]+/g, " ")}</TableHead>
                  ))}
                  <TableHead>Approved on</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.site}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      <a href={row.url} target="_blank" rel="noreferrer" className="hover:underline">
                        {shortUrl(row.url)}
                      </a>
                    </TableCell>
                    {columns.map((column) => {
                      const value = row.data[column];
                      return (
                        <TableCell key={column}>
                          {value === null || value === undefined || value === "" ? (
                            <span className="text-muted-foreground">—</span>
                          ) : (
                            String(value)
                          )}
                        </TableCell>
                      );
                    })}
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDate(row.extracted_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="border-t border-border bg-surface px-5 py-3 text-xs text-muted-foreground">
            {rows.length} {rows.length === 1 ? "record" : "records"}
          </div>
        </Card>
      )}
    </AppShell>
  );
}
