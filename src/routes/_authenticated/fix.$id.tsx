import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ArrowLeft, Check, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";

import { AppShell } from "@/components/app-shell";
import { ReasonBadge } from "@/components/reason-badge";
import { Card } from "@/design-system/catchbox/components/card";
import { Button } from "@/design-system/catchbox/components/button";
import { Input } from "@/design-system/catchbox/components/input";
import { Label } from "@/design-system/catchbox/components/label";
import { Skeleton } from "@/design-system/catchbox/components/skeleton";
import { Textarea } from "@/design-system/catchbox/components/textarea";
import { approveCatch, discardCatch, fetchCatch } from "@/lib/catchbox-service";
import { timeAgo } from "@/lib/format";
import { suggestFieldValues } from "@/lib/suggest.functions";
import { syncSheet } from "@/lib/sheets.functions";
import type { FieldSuggestion } from "@/lib/suggest-types";

export const Route = createFileRoute("/_authenticated/fix/$id")({
  head: () => ({
    meta: [
      { title: "Fix it — Catchbox" },
      {
        name: "description",
        content:
          "See what the scraper tried to get, fill in the missing piece, and approve it in one go.",
      },
      { property: "og:title", content: "Fix it — Catchbox" },
      {
        property: "og:description",
        content: "See what the scraper tried to get and fill in the missing piece.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FixPage,
});

function prettyLabel(key: string): string {
  const spaced = key.replace(/[_-]+/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function FixPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [pageText, setPageText] = useState("");
  const [suggestions, setSuggestions] = useState<Record<string, FieldSuggestion>>({});
  const runSuggest = useServerFn(suggestFieldValues);
  const runSheetSync = useServerFn(syncSheet);

  const { data, isPending, error } = useQuery({
    queryKey: ["catch", id],
    queryFn: () => fetchCatch(id),
  });

  const fields = useMemo(() => {
    if (!data) return [] as string[];
    const keys = new Set<string>(Object.keys(data.raw_payload));
    for (const field of data.missing_fields) keys.add(field);
    return [...keys];
  }, [data]);

  function valueFor(key: string): string {
    if (key in edits) return edits[key] ?? "";
    const original = data?.raw_payload[key];
    return original === null || original === undefined ? "" : String(original);
  }

  const approve = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {};
      for (const key of fields) {
        const value = valueFor(key).trim();
        payload[key] = value === "" ? null : value;
      }
      await approveCatch(id, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["catches"] });
      queryClient.invalidateQueries({ queryKey: ["approved"] });
      toast.success("Approved — it's in your approved data now.");
      // Keep the user's Google Sheet in step; never block the approval on it.
      runSheetSync()
        .then(() => queryClient.invalidateQueries({ queryKey: ["sheet-status"] }))
        .catch(() =>
          toast.error("Approved, but your Google Sheet didn't update. We'll retry next time."),
        );
      navigate({ to: "/queue" });
    },
    onError: (mutationError: Error) => {
      toast.error(mutationError.message || "We couldn't approve that. Please try again.");
    },
  });

  const discard = useMutation({
    mutationFn: () => discardCatch(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["catches"] });
      toast.success("Discarded. It won't come back.");
      navigate({ to: "/queue" });
    },
    onError: () => toast.error("We couldn't discard that. Please try again."),
  });

  const suggest = useMutation({
    mutationFn: () => runSuggest({ data: { id, pageText } }),
    onSuccess: ({ suggestions: list }) => {
      const byField: Record<string, FieldSuggestion> = {};
      const fills: Record<string, string> = {};
      for (const item of list) {
        byField[item.field] = item;
        if (item.value !== null && valueFor(item.field).trim() === "")
          fills[item.field] = item.value;
      }
      setSuggestions(byField);
      setEdits((current) => ({ ...current, ...fills }));
      const filled = Object.keys(fills).length;
      toast.success(
        filled
          ? `Filled in ${filled} ${filled === 1 ? "field" : "fields"}. Please check before approving.`
          : "No new values found in what you pasted.",
      );
    },
    onError: (suggestError: Error) => toast.error(suggestError.message),
  });

  const missingCount = fields.filter((key) => valueFor(key).trim() === "").length;

  return (
    <AppShell
      title="Fix it"
      subtitle="On the left is what the scraper managed to get and what tripped it up. On the right, fill in what's missing."
      actions={
        <Button asChild variant="ghost" size="sm">
          <Link to="/queue">
            <ArrowLeft className="size-4" />
            Back to the inbox
          </Link>
        </Button>
      }
    >
      {error ? (
        <Card className="border-destructive/40 bg-destructive/10 p-6 text-sm">
          We couldn't open that item. Head back to the inbox and try again.
        </Card>
      ) : isPending ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-80 w-full rounded-xl" />
          <Skeleton className="h-80 w-full rounded-xl" />
        </div>
      ) : !data ? (
        <Card className="border-border bg-card p-10 text-center text-sm text-muted-foreground">
          That item isn't here anymore — it may already have been handled.
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-border bg-card p-6">
            <div className="flex flex-wrap items-center gap-2">
              <ReasonBadge reason={data.error_type} />
              <span className="text-xs text-muted-foreground">
                waiting {timeAgo(data.created_at)}
              </span>
            </div>
            <h2 className="mt-4 font-display text-lg font-semibold">{data.site}</h2>
            <a
              href={data.url}
              target="_blank"
              rel="noreferrer"
              className="mt-1 block break-all font-mono text-xs text-primary hover:underline"
            >
              {data.url}
            </a>

            <h3 className="mt-6 text-sm font-semibold">What the scraper got</h3>
            <dl className="mt-3 space-y-2 text-sm">
              {fields.map((key) => {
                const original = data.raw_payload[key];
                const isEmpty = original === null || original === undefined || original === "";
                return (
                  <div key={key} className="flex justify-between gap-4 border-b border-border pb-2">
                    <dt className="text-muted-foreground">{prettyLabel(key)}</dt>
                    <dd className={isEmpty ? "text-destructive" : "text-right"}>
                      {isEmpty ? "nothing" : String(original)}
                    </dd>
                  </div>
                );
              })}
            </dl>

            {data.error_trace ? (
              <>
                <h3 className="mt-6 text-sm font-semibold">Why it got stuck</h3>
                <pre className="mt-3 overflow-x-auto rounded-lg bg-surface p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap text-muted-foreground">
                  {data.error_trace}
                </pre>
              </>
            ) : null}
          </Card>

          <Card className="h-fit border-border bg-card p-6">
            <h3 className="text-sm font-semibold">Fill in what's missing</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {missingCount === 0
                ? "Everything's filled in. Approve it when it looks right."
                : `${missingCount} ${missingCount === 1 ? "field is" : "fields are"} still empty.`}
            </p>

            <div className="mt-6 rounded-lg border border-border bg-surface p-4">
              <Label htmlFor="page-text" className="flex items-center gap-2">
                <Sparkles className="size-4 text-primary" />
                Ask AI for help
              </Label>
              <p className="mt-1 text-xs text-muted-foreground">
                Paste any text you copied from the page. We'll suggest the missing values, show
                where each came from, and fill them in for you to check.
              </p>
              <Textarea
                id="page-text"
                value={pageText}
                onChange={(event) => setPageText(event.target.value)}
                placeholder="Paste the page text here (optional)"
                className="mt-3 min-h-24"
              />
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => suggest.mutate()}
                disabled={suggest.isPending}
              >
                <Sparkles className="size-4" />
                {suggest.isPending ? "Looking…" : "Suggest values"}
              </Button>
            </div>

            <div className="mt-6 space-y-4">
              {fields.map((key) => {
                const hint = suggestions[key];
                return (
                  <div key={key}>
                    <Label htmlFor={`field-${key}`}>{prettyLabel(key)}</Label>
                    <Input
                      id={`field-${key}`}
                      value={valueFor(key)}
                      placeholder={`Type the ${prettyLabel(key).toLowerCase()}`}
                      onChange={(event) =>
                        setEdits((current) => ({ ...current, [key]: event.target.value }))
                      }
                      className="mt-2"
                    />
                    {hint ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">
                          AI suggestion ({hint.confidence} confidence):
                        </span>{" "}
                        {hint.value === null ? "not found — " : null}
                        <span className="italic">“{hint.evidence}”</span>
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button onClick={() => approve.mutate()} disabled={approve.isPending}>
                <Check className="size-4" />
                {approve.isPending ? "Approving…" : "Approve"}
              </Button>
              <Button asChild variant="outline">
                <Link to="/queue">Skip for now</Link>
              </Button>
              <Button
                variant="ghost"
                onClick={() => discard.mutate()}
                disabled={discard.isPending}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="size-4" />
                Discard
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Approving saves the record and closes this item in one step — it can never end up half
              saved.
            </p>
          </Card>
        </div>
      )}
    </AppShell>
  );
}
