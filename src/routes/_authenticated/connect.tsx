import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Check, Copy, Eye, EyeOff, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchIngestKey, rotateIngestKey } from "@/lib/catchbox-service";

export const Route = createFileRoute("/_authenticated/connect")({
  head: () => ({
    meta: [
      { title: "Connect your scraper — Catchbox" },
      {
        name: "description",
        content: "Copy your personal key and one snippet into your script. That's the whole setup.",
      },
      { property: "og:title", content: "Connect your scraper — Catchbox" },
      {
        property: "og:description",
        content: "Copy your personal key and one snippet into your script.",
      },
    ],
  }),
  component: ConnectPage,
});

function snippetFor(key: string, origin: string): string {
  return `import requests

CATCHBOX_URL = "${origin}/api/public/triage/ingest"
CATCHBOX_KEY = "${key}"

def catch(url, site, reason, what_you_got, missing, error_text=""):
    """Call this instead of crashing or saving half-empty data."""
    requests.post(
        CATCHBOX_URL,
        headers={"x-ingest-key": CATCHBOX_KEY},
        json={
            "url": url,
            "site": site,
            "reason": reason,          # page_changed | blocked | missing_info | other
            "got": what_you_got,       # whatever you did manage to read
            "missing": missing,        # names of the pieces you couldn't read
            "error": error_text,       # the error, so the person can see why
        },
        timeout=10,
    )

# Example, inside your scraper:
price = page.select_one("p.price_color")
if price is None:
    catch(
        url=page_url,
        site="books.toscrape.com",
        reason="page_changed",
        what_you_got={"title": title, "price": None},
        missing=["price"],
        error_text='Nothing matched "p.price_color"',
    )
`;
}

function ConnectPage() {
  const queryClient = useQueryClient();
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState<"key" | "snippet" | null>(null);

  const { data: key, isPending } = useQuery({
    queryKey: ["ingest-key"],
    queryFn: fetchIngestKey,
  });

  const rotate = useMutation({
    mutationFn: rotateIngestKey,
    onSuccess: (newKey) => {
      queryClient.setQueryData(["ingest-key"], newKey);
      setRevealed(true);
      toast.success("New key ready. Paste it into your script to keep sending.");
    },
    onError: () => toast.error("We couldn't make a new key. Please try again."),
  });

  const origin = typeof window === "undefined" ? "https://your-app.lovable.app" : window.location.origin;
  const snippet = key ? snippetFor(key, origin) : "";

  async function copy(text: string, which: "key" | "snippet") {
    await navigator.clipboard.writeText(text);
    setCopied(which);
    toast.success(which === "key" ? "Key copied" : "Snippet copied");
    window.setTimeout(() => setCopied(null), 1500);
  }

  return (
    <AppShell
      title="Connect your scraper"
      subtitle="Two things to copy: your personal key, and a short snippet. Like plugging in a lamp — copy this, paste it in your script, done."
    >
      <div className="space-y-6">
        <Card className="border-border bg-card p-6">
          <h2 className="font-display text-lg font-semibold">1. Your personal key</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            This key tells Catchbox the failures are yours. Keep it to yourself — anyone who has it
            can send things into your inbox.
          </p>

          {isPending ? (
            <Skeleton className="mt-5 h-12 w-full rounded-lg" />
          ) : (
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded-lg bg-surface px-4 py-3 font-mono text-sm">
                {revealed ? key : "cbx_" + "•".repeat(32)}
              </code>
              <Button variant="outline" size="icon" onClick={() => setRevealed((value) => !value)}>
                {revealed ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                <span className="sr-only">{revealed ? "Hide key" : "Show key"}</span>
              </Button>
              <Button variant="outline" onClick={() => copy(key ?? "", "key")}>
                {copied === "key" ? <Check className="size-4" /> : <Copy className="size-4" />}
                Copy
              </Button>
              <Button
                variant="ghost"
                onClick={() => rotate.mutate()}
                disabled={rotate.isPending}
                className="text-muted-foreground"
              >
                <RefreshCw className="size-4" />
                Replace key
              </Button>
            </div>
          )}
        </Card>

        <Card className="border-border bg-card p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-semibold">2. The snippet</h2>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Paste this into your script. Wherever your scraper would have crashed or saved
                half-empty data, call <code className="font-mono text-xs">catch(...)</code> instead.
              </p>
            </div>
            <Button variant="outline" onClick={() => copy(snippet, "snippet")} disabled={!key}>
              {copied === "snippet" ? <Check className="size-4" /> : <Copy className="size-4" />}
              Copy snippet
            </Button>
          </div>

          {isPending ? (
            <Skeleton className="mt-5 h-72 w-full rounded-lg" />
          ) : (
            <pre className="mt-5 overflow-x-auto rounded-lg bg-surface p-5 font-mono text-xs leading-relaxed">
              {snippet}
            </pre>
          )}
        </Card>

        <Card className="border-border bg-card p-6">
          <h2 className="font-display text-lg font-semibold">3. That's it</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            The next time that site changes, blocks you, or leaves a field empty, it shows up under
            "Things that need a quick look" instead of quietly breaking your data.
          </p>
        </Card>
      </div>
    </AppShell>
  );
}
