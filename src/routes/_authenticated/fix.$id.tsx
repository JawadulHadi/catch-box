import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ArrowLeft, Check, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { ReasonBadge } from "@/components/reason-badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { approveCatch, discardCatch, fetchCatch } from "@/lib/catchbox-service";
import { timeAgo } from "@/lib/format";

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

            <div className="mt-6 space-y-4">
              {fields.map((key) => (
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
                </div>
              ))}
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
