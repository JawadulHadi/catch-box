import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Plus, Trash2, Play } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteRecipe, fetchRecipes } from "@/lib/catchbox-service";
import { runRecipe, saveRecipe } from "@/lib/recipes.functions";
import { timeAgo } from "@/lib/format";

const description = "Tell Catchbox which page to read and where each piece of info lives — no code needed.";

export const Route = createFileRoute("/_authenticated/builder")({
  head: () => ({
    meta: [
      { title: "Build a scraper — Catchbox" },
      { name: "description", content: description },
      { property: "og:title", content: "Build a scraper — Catchbox" },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BuilderPage,
});

type FieldDraft = { name: string; selector: string; attr: string };
const emptyField: FieldDraft = { name: "", selector: "", attr: "" };

function BuilderPage() {
  const queryClient = useQueryClient();
  const save = useServerFn(saveRecipe);
  const run = useServerFn(runRecipe);
  const { data: recipes } = useQuery({ queryKey: ["recipes"], queryFn: fetchRecipes });

  const [site, setSite] = useState("");
  const [startUrl, setStartUrl] = useState("");
  const [fields, setFields] = useState<FieldDraft[]>([{ name: "title", selector: "h1", attr: "" }]);

  function refresh() {
    void queryClient.invalidateQueries();
  }

  const saveMutation = useMutation({
    mutationFn: () =>
      save({
        data: {
          site,
          startUrl,
          fields: fields
            .filter((f) => f.name && f.selector)
            .map((f) => ({ name: f.name, selector: f.selector, attr: f.attr || undefined })),
        },
      }),
    onSuccess: () => {
      toast.success("Scraper saved. Press “Run now” to try it.");
      setSite("");
      setStartUrl("");
      setFields([{ ...emptyField }]);
      refresh();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "We couldn't save that."),
  });

  const runMutation = useMutation({
    mutationFn: (id: string) => run({ data: { id } }),
    onSuccess: (result) => {
      if (result.outcome === "approved") toast.success(result.message);
      else toast.warning(`Caught it: ${result.message} It's waiting in your inbox.`);
      refresh();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "The run didn't work."),
  });

  const removeMutation = useMutation({ mutationFn: deleteRecipe, onSuccess: refresh });

  function updateField(index: number, patch: Partial<FieldDraft>) {
    setFields((prev) => prev.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  }

  return (
    <AppShell title="Build a scraper" subtitle={description}>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="font-display text-lg font-semibold">New scraper</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Each piece of info needs a name and a “where to find it” — a CSS selector like <code>h1</code> or{" "}
            <code>.price</code>. In Chrome, right-click the text → Inspect → Copy selector.
          </p>
          <form
            className="mt-5 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              saveMutation.mutate();
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="site">Name for this site</Label>
              <Input id="site" value={site} onChange={(e) => setSite(e.target.value)} placeholder="Blue Mug Shop" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="url">Page to read</Label>
              <Input id="url" type="url" value={startUrl} onChange={(e) => setStartUrl(e.target.value)} placeholder="https://shop.example.com/blue-mug" required />
            </div>
            <div className="space-y-3">
              <Label>What to pick up</Label>
              {fields.map((f, i) => (
                <div key={i} className="grid grid-cols-[1fr_1.4fr_0.8fr_auto] gap-2">
                  <Input aria-label="Field name" value={f.name} onChange={(e) => updateField(i, { name: e.target.value })} placeholder="price" />
                  <Input aria-label="Where to find it" value={f.selector} onChange={(e) => updateField(i, { selector: e.target.value })} placeholder=".product-price" className="font-mono" />
                  <Input aria-label="Attribute (optional)" value={f.attr} onChange={(e) => updateField(i, { attr: e.target.value })} placeholder="text" />
                  <Button type="button" variant="ghost" size="icon" aria-label="Remove field" onClick={() => setFields((p) => p.filter((_, j) => j !== i))}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
              <p className="text-xs text-muted-foreground">Leave the last box empty to take the visible text, or type e.g. <code>href</code> or <code>src</code>.</p>
              <Button type="button" variant="outline" size="sm" onClick={() => setFields((p) => [...p, { ...emptyField }])}>
                <Plus className="size-4" /> Add a field
              </Button>
            </div>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Saving…" : "Save scraper"}
            </Button>
          </form>
        </Card>

        <div className="space-y-4">
          <h2 className="font-display text-lg font-semibold">Your built scrapers</h2>
          {(recipes?.length ?? 0) === 0 ? (
            <Card className="p-6 text-sm text-muted-foreground">Nothing built yet. Save one on the left to get started.</Card>
          ) : (
            recipes?.map((r) => (
              <Card key={r.id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">{r.site}</p>
                    <p className="truncate text-sm text-muted-foreground">{r.start_url}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {r.fields.map((f) => f.name).join(", ")} ·{" "}
                      {r.last_run_at ? `last run ${timeAgo(r.last_run_at)} (${r.last_result === "approved" ? "all good" : "caught"})` : "not run yet"}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button size="sm" onClick={() => runMutation.mutate(r.id)} disabled={runMutation.isPending}>
                      <Play className="size-4" /> Run now
                    </Button>
                    <Button size="icon" variant="ghost" aria-label={`Delete ${r.site}`} onClick={() => removeMutation.mutate(r.id)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
          <p className="text-sm text-muted-foreground">
            Anything that doesn't come out right lands in <Link to="/queue" className="text-primary underline">Needs a quick look</Link>.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
