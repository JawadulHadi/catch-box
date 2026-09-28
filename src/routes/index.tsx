import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Check, Inbox, ShieldCheck, Wrench } from "lucide-react";

import { Button } from "@/design-system/catchbox/components/button";
import { Card } from "@/design-system/catchbox/components/card";
import { Badge } from "@/design-system/catchbox/components/badge";
import { CatchboxMark } from "@/design-system/catchbox/components/catchbox-mark";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Catchbox — a safety net for your scrapers" },
      {
        name: "description",
        content:
          "When your scraper gets confused, a person fixes it before bad data ever reaches you. Failed scrapes land in an inbox, get fixed in seconds, and only then become usable data.",
      },
      { property: "og:title", content: "Catchbox — a safety net for your scrapers" },
      {
        property: "og:description",
        content:
          "Failed scrapes land in an inbox, get fixed in seconds, and only then become usable data.",
      },
    ],
  }),
  component: Landing,
});

const previewRows = [
  {
    site: "books.toscrape.com",
    reason: "The page changed",
    detail: "The price moved somewhere new",
    tone: "text-warning",
  },
  {
    site: "shop.example-outdoors.com",
    reason: "Information was missing",
    detail: "No product code came back",
    tone: "text-primary",
  },
  {
    site: "shop.example-outdoors.com",
    reason: "Blocked by the site",
    detail: "Got a 'verify you are human' page",
    tone: "text-destructive",
  },
];

const steps = [
  {
    icon: Inbox,
    title: "It lands in your inbox",
    body: "Your scraper hits a wall and tells Catchbox instead of crashing or saving nonsense.",
  },
  {
    icon: Wrench,
    title: "You fix it in seconds",
    body: "You see what the scraper managed to grab, what it missed, and why. Type in the missing piece.",
  },
  {
    icon: ShieldCheck,
    title: "Then it counts as real data",
    body: "Approve it and the record joins your approved data. Nothing broken slips through unnoticed.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6 lg:px-10">
        <div className="flex items-center gap-2">
          <CatchboxMark className="size-7" />
          <span className="font-display text-lg font-semibold">Catchbox</span>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link to="/auth">Sign in</Link>
        </Button>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl gap-12 px-5 pt-10 pb-20 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:px-10 lg:pt-20">
          <div>
            <Badge
              variant="outline"
              className="border-primary/40 bg-primary/10 font-normal text-primary"
            >
              A safety net for web scrapers
            </Badge>
            <h1 className="mt-6 text-4xl leading-tight font-semibold text-balance lg:text-5xl">
              When your scraper gets confused, a person fixes it before bad data ever reaches you.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground">
              Scrapers break quietly. A site changes its layout, throws up a "prove you're human"
              page, or hands back a page missing the one thing you needed — and most scrapers either
              crash or save garbage without telling anyone. Catchbox is the step in between.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild size="lg">
                <Link to="/auth">
                  Start free
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <span className="text-sm text-muted-foreground">
                Sign in with Google · takes a few seconds
              </span>
            </div>
            <ul className="mt-8 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
              {[
                "Nothing broken reaches your data",
                "Fix a catch in one screen",
                "Your data stays private to you",
                "Download everything as a spreadsheet",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <Check className="size-4 text-primary" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <Card className="overflow-hidden border-border bg-card p-0">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <p className="font-display text-sm font-semibold">Needs a quick look</p>
                <p className="text-xs text-muted-foreground">3 waiting · newest first</p>
              </div>
              <Inbox className="size-4 text-primary" />
            </div>
            <ul className="divide-y divide-border">
              {previewRows.map((row) => (
                <li key={row.detail} className="px-5 py-4">
                  <p className="font-mono text-xs text-muted-foreground">{row.site}</p>
                  <p className={`mt-1 text-sm font-medium ${row.tone}`}>{row.reason}</p>
                  <p className="text-sm text-muted-foreground">{row.detail}</p>
                </li>
              ))}
            </ul>
            <div className="border-t border-border bg-surface px-5 py-4 text-xs text-muted-foreground">
              This is what your inbox looks like once your scraper is plugged in.
            </div>
          </Card>
        </section>

        <section className="border-t border-border bg-sidebar">
          <div className="mx-auto max-w-6xl px-5 py-16 lg:px-10">
            <h2 className="text-2xl font-semibold lg:text-3xl">How it works</h2>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {steps.map((step, index) => (
                <Card key={step.title} className="border-border bg-card p-6">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <step.icon className="size-5" />
                  </div>
                  <p className="mt-5 font-mono text-xs text-muted-foreground">
                    Step {index + 1}
                  </p>
                  <h3 className="mt-1 text-lg font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-20 text-center lg:px-10">
          <h2 className="text-3xl font-semibold text-balance">
            Save yourself a bad afternoon of debugging.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Plug your scraper in with one key and one snippet. The next time something breaks,
            you'll know before your data does.
          </p>
          <Button asChild size="lg" className="mt-8">
            <Link to="/auth">
              Start free
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-6 text-sm text-muted-foreground lg:px-10">
          <span>Catchbox</span>
          <span>Your data is private to your account.</span>
        </div>
      </footer>
    </div>
  );
}
