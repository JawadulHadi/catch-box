import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { useCallback } from "react";

import { CatchboxMark } from "@/design-system/catchbox/components/catchbox-mark";
import { ThemeToggle } from "@/design-system/catchbox/components/theme-toggle";
import { Alert, AlertDescription, AlertTitle } from "@/design-system/catchbox/components/alert";
import { Badge } from "@/design-system/catchbox/components/badge";
import { Button } from "@/design-system/catchbox/components/button";
import { Card } from "@/design-system/catchbox/components/card";
import { Checkbox } from "@/design-system/catchbox/components/checkbox";
import { Input } from "@/design-system/catchbox/components/input";
import { Label } from "@/design-system/catchbox/components/label";
import { Progress } from "@/design-system/catchbox/components/progress";
import { Skeleton } from "@/design-system/catchbox/components/skeleton";
import { Switch } from "@/design-system/catchbox/components/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/design-system/catchbox/components/tabs";
import { Textarea } from "@/design-system/catchbox/components/textarea";
import { cn } from "@/design-system/catchbox/lib/utils";

const description =
  "Every color, font and building block Catchbox uses, in both the dark and light themes.";

export const Route = createFileRoute("/showcase")({
  head: () => ({
    meta: [
      { title: "Look and feel — Catchbox" },
      { name: "description", content: description },
      { property: "og:title", content: "Look and feel — Catchbox" },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ShowcasePage,
});

const swatches = [
  { token: "bg-background", role: "Page background", className: "bg-background text-foreground" },
  { token: "bg-card", role: "Cards and panels", className: "bg-card text-card-foreground" },
  { token: "bg-surface", role: "Raised surface", className: "bg-surface text-surface-foreground" },
  {
    token: "bg-primary",
    role: "The amber catch — main actions",
    className: "bg-primary text-primary-foreground",
  },
  { token: "bg-accent", role: "Soft highlight", className: "bg-accent text-accent-foreground" },
  { token: "bg-muted", role: "Quiet areas", className: "bg-muted text-muted-foreground" },
  {
    token: "bg-success",
    role: "Approved, running well",
    className: "bg-success text-success-foreground",
  },
  { token: "bg-warning", role: "A few hiccups", className: "bg-warning text-warning-foreground" },
  {
    token: "bg-destructive",
    role: "Needs attention",
    className: "bg-destructive text-destructive-foreground",
  },
] as const;

const sections = [
  "Colors",
  "Type",
  "Buttons",
  "Badges",
  "Form fields",
  "Feedback",
  "Tabs",
  "In context",
  "Components",
] as const;

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-8 border-t border-border py-10">
      <h2 className="font-display text-2xl font-semibold">{title}</h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function Caption({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 font-mono text-xs text-muted-foreground">{children}</p>;
}

function ShowcasePage() {
  const [filter, setFilter] = useState("");
  const shown = sections.filter((s) => s.toLowerCase().includes(filter.toLowerCase()));
  const [activeComponent, setActiveComponent] = useState("Button");
  const [showCode, setShowCode] = useState(false);
  const components = [
    "Button",
    "Badge",
    "Card",
    "Alert",
    "Input",
    "Textarea",
    "Label",
    "Tabs",
    "Checkbox",
    "Switch",
    "Progress",
    "Skeleton",
    "CatchboxMark",
    "ThemeToggle",
  ] as const;
  const [componentFilter, setComponentFilter] = useState("");
  const componentExamples: Record<string, string> = {
    Button: `<Button variant="default">Approve record</Button>`,
    Badge: `<Badge variant="outline">Needs a look</Badge>`,
    Card: `<Card><CardTitle>Blue Mug Shop</CardTitle></Card>`,
    Alert: `<Alert><AlertTitle>All caught up</AlertTitle></Alert>`,
    Input: `<Input aria-label="Price" placeholder="€12,50" />`,
    Textarea: `<Textarea aria-label="Page text" />`,
    Label: `<Label htmlFor="price">Price</Label>`,
    Tabs: `<Tabs defaultValue="pending"><TabsTrigger value="pending">Needs a look</TabsTrigger></Tabs>`,
    Checkbox: `<Checkbox aria-label="Email alerts" />`,
    Switch: `<Switch aria-label="Keep sheet updated" />`,
    Progress: `<Progress value={72} aria-label="Successful runs" />`,
    Skeleton: `<Skeleton className="h-12 w-full" />`,
    CatchboxMark: `<CatchboxMark className="size-8" />`,
    ThemeToggle: `<ThemeToggle />`,
  };
  const selectComponent = useCallback((name: string) => {
    setActiveComponent(name);
    setShowCode(false);
  }, []);

  return (
    <div className="min-h-screen bg-background lg:flex">
      <aside className="border-b border-border bg-sidebar p-5 lg:sticky lg:top-0 lg:h-screen lg:w-60 lg:shrink-0 lg:border-r lg:border-b-0">
        <Link to="/queue" className="flex items-center gap-2">
          <CatchboxMark className="size-7" />
          <span className="font-display text-lg font-semibold">Catchbox</span>
        </Link>
        <Input
          className="mt-6"
          placeholder="Find a section"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          aria-label="Find a section"
        />
        <nav className="mt-4 flex flex-wrap gap-1 lg:flex-col">
          {shown.map((s) => (
            <a
              key={s}
              href={`#${s}`}
              className="rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
            >
              {s}
            </a>
          ))}
        </nav>
        <ThemeToggle className="mt-4 text-muted-foreground" />
      </aside>

      <main className="mx-auto w-full max-w-5xl px-5 py-10 lg:px-10">
        <p className="text-sm font-medium text-primary">Look and feel</p>
        <h1 className="mt-2 font-display text-4xl font-semibold lg:text-5xl">
          Calm, warm, and quick to read.
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          {description} Flip the theme in the sidebar to check both.
        </p>

        <Section id="Colors" title="Colors">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {swatches.map((s) => (
              <div key={s.token}>
                <div
                  className={cn(
                    "flex h-24 items-end rounded-xl border border-border p-4 text-sm font-medium",
                    s.className,
                  )}
                >
                  Aa — {s.role}
                </div>
                <Caption>{s.token}</Caption>
              </div>
            ))}
          </div>
        </Section>

        <Section id="Type" title="Type">
          <div className="space-y-6">
            <div>
              <p className="font-display text-5xl font-semibold">Nothing broken gets through</p>
              <Caption>font-display text-5xl · Space Grotesk 500–700</Caption>
            </div>
            <div>
              <p className="font-display text-2xl font-semibold">Things that need a quick look</p>
              <Caption>font-display text-2xl</Caption>
            </div>
            <div>
              <p className="max-w-2xl">
                The page changed, so the price wasn't where your scraper expected. Add it below and
                press approve.
              </p>
              <Caption>font-sans text-base · IBM Plex Sans 400–600</Caption>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Last trouble 2 hours ago</p>
              <Caption>text-sm text-muted-foreground</Caption>
            </div>
            <div>
              <code className="rounded bg-muted px-2 py-1 font-mono text-sm">cbx_4f9a…e21c</code>
              <Caption>font-mono · IBM Plex Mono</Caption>
            </div>
          </div>
        </Section>

        <Section id="Buttons" title="Buttons">
          <div className="grid gap-6 sm:grid-cols-2">
            {(["default", "secondary", "outline", "ghost", "destructive", "link"] as const).map(
              (variant) => (
                <div key={variant}>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button variant={variant}>Approve record</Button>
                    <Button variant={variant} size="sm">
                      Small
                    </Button>
                    <Button variant={variant} disabled>
                      Disabled
                    </Button>
                  </div>
                  <Caption>{`<Button variant="${variant}">`}</Caption>
                </div>
              ),
            )}
          </div>
        </Section>

        <Section id="Badges" title="Badges">
          <div className="flex flex-wrap gap-3">
            <Badge>New</Badge>
            <Badge variant="secondary">Blue Mug Shop</Badge>
            <Badge variant="outline">The page changed</Badge>
            <Badge variant="destructive">Blocked by the site</Badge>
            <Badge variant="outline" className="border-success/40 bg-success/10 text-success">
              Running smoothly
            </Badge>
            <Badge variant="outline" className="border-warning/40 bg-warning/10 text-warning">
              A few hiccups
            </Badge>
          </div>
          <Caption>{`<Badge variant="default | secondary | outline | destructive">`}</Caption>
        </Section>

        <Section id="Form fields" title="Form fields">
          <div className="grid max-w-xl gap-5">
            <div className="grid gap-2">
              <Label htmlFor="sc-price">Price</Label>
              <Input id="sc-price" placeholder="€12,50" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sc-disabled">Page address</Label>
              <Input id="sc-disabled" disabled value="https://shop.example.com/blue-mug" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sc-text">Page text</Label>
              <Textarea id="sc-text" placeholder="Paste what you see on the page…" />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="sc-check" defaultChecked />
              <Label htmlFor="sc-check">Email me when a site keeps failing</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="sc-switch" defaultChecked />
              <Label htmlFor="sc-switch">Keep my Google Sheet updated</Label>
            </div>
          </div>
        </Section>

        <Section id="Feedback" title="Feedback">
          <div className="grid gap-4">
            <Alert>
              <AlertTitle>All caught up</AlertTitle>
              <AlertDescription>Nothing needs a look right now. Nice.</AlertDescription>
            </Alert>
            <Alert variant="destructive">
              <AlertTitle>We couldn't load your scrapers</AlertTitle>
              <AlertDescription>Please refresh and try again.</AlertDescription>
            </Alert>
            <div>
              <Progress value={72} />
              <Caption>{"<Progress value={72} />"} — 72 % of runs worked</Caption>
            </div>
            <Skeleton className="h-16 w-full rounded-xl" />
            <Button
              variant="outline"
              className="w-fit"
              onClick={() => toast.success("Approved and added to your sheet.")}
            >
              Show a toast
            </Button>
          </div>
        </Section>

        <Section id="Tabs" title="Tabs">
          <Tabs defaultValue="pending" className="max-w-xl">
            <TabsList>
              <TabsTrigger value="pending">Needs a look</TabsTrigger>
              <TabsTrigger value="resolved">Approved</TabsTrigger>
            </TabsList>
            <TabsContent value="pending" className="text-sm text-muted-foreground">
              3 scrapes are waiting for you.
            </TabsContent>
            <TabsContent value="resolved" className="text-sm text-muted-foreground">
              128 records approved this week.
            </TabsContent>
          </Tabs>
        </Section>

        <Section id="Components" title="Components">
          <div className="grid gap-6 md:grid-cols-[11rem_minmax(0,1fr)]">
            <div className="min-w-0">
              <Input
                aria-label="Find a component"
                placeholder="Find a component"
                value={componentFilter}
                onChange={(event) => setComponentFilter(event.target.value)}
              />
              <nav
                aria-label="Components"
                className="mt-3 flex gap-1 overflow-x-auto pb-2 md:flex-col md:overflow-visible"
              >
                {components
                  .filter((name) => name.toLowerCase().includes(componentFilter.toLowerCase()))
                  .map((name) => (
                    <Button
                      key={name}
                      variant={activeComponent === name ? "secondary" : "ghost"}
                      size="sm"
                      className="shrink-0 justify-start"
                      onClick={() => selectComponent(name)}
                    >
                      {name}
                    </Button>
                  ))}
              </nav>
            </div>
            <div className="min-w-0 border-t border-border pt-6 md:border-l md:border-t-0 md:pl-6 md:pt-0">
              <h3 className="font-display text-xl font-semibold">{activeComponent}</h3>
              <div className="mt-6 flex min-h-24 flex-wrap items-center gap-4">
                {activeComponent === "Button" && (
                  <>
                    <Button>Approve record</Button>
                    <Button variant="outline">Open record</Button>
                    <Button variant="destructive">Throw away</Button>
                    <Button disabled>Unavailable</Button>
                  </>
                )}
                {activeComponent === "Badge" && (
                  <>
                    <Badge>New</Badge>
                    <Badge variant="outline">Needs a look</Badge>
                    <Badge variant="destructive">Blocked</Badge>
                  </>
                )}
                {activeComponent === "Card" && (
                  <Card className="w-full p-5">
                    <p className="font-display font-semibold">Blue Mug Shop</p>
                    <p className="mt-1 text-sm text-muted-foreground">Price ready for review</p>
                  </Card>
                )}
                {activeComponent === "Alert" && (
                  <Alert>
                    <AlertTitle>All caught up</AlertTitle>
                    <AlertDescription>Nothing needs a look right now.</AlertDescription>
                  </Alert>
                )}
                {activeComponent === "Input" && (
                  <Input aria-label="Price" placeholder="€12,50" className="max-w-xs" />
                )}
                {activeComponent === "Textarea" && (
                  <Textarea aria-label="Page text" placeholder="Paste what you see on the page…" />
                )}
                {activeComponent === "Label" && (
                  <Label htmlFor="gallery-price">
                    Price <Input id="gallery-price" className="mt-2" placeholder="€12,50" />
                  </Label>
                )}
                {activeComponent === "Tabs" && (
                  <Tabs defaultValue="pending">
                    <TabsList>
                      <TabsTrigger value="pending">Needs a look</TabsTrigger>
                      <TabsTrigger value="approved">Approved</TabsTrigger>
                    </TabsList>
                    <TabsContent value="pending">3 waiting for a review</TabsContent>
                    <TabsContent value="approved">128 records approved</TabsContent>
                  </Tabs>
                )}
                {activeComponent === "Checkbox" && (
                  <div className="flex items-center gap-2">
                    <Checkbox id="gallery-alerts" />
                    <Label htmlFor="gallery-alerts">Email alerts</Label>
                  </div>
                )}
                {activeComponent === "Switch" && (
                  <div className="flex items-center gap-2">
                    <Switch id="gallery-sheet" />
                    <Label htmlFor="gallery-sheet">Keep sheet updated</Label>
                  </div>
                )}
                {activeComponent === "Progress" && (
                  <Progress value={72} aria-label="Successful runs" />
                )}
                {activeComponent === "Skeleton" && <Skeleton className="h-12 w-full" />}
                {activeComponent === "CatchboxMark" && <CatchboxMark className="size-9" />}
                {activeComponent === "ThemeToggle" && <ThemeToggle />}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="mt-6"
                onClick={() => setShowCode(!showCode)}
                aria-expanded={showCode}
              >
                {" "}
                {showCode ? "Hide code" : "Show code"}{" "}
              </Button>
              {showCode && (
                <pre className="mt-2 overflow-x-auto rounded-md bg-muted p-4 font-mono text-xs">
                  <code>{componentExamples[activeComponent]}</code>
                </pre>
              )}
            </div>
          </div>
        </Section>

        <Section id="In context" title="In context">
          <Card className="max-w-xl p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-lg font-semibold">Blue Mug Shop</h3>
                <p className="mt-1 text-sm text-muted-foreground">shop.example.com/blue-mug</p>
              </div>
              <Badge variant="outline">Information was missing</Badge>
            </div>
            <div className="mt-5 grid gap-2">
              <Label htmlFor="sc-fix">Price</Label>
              <Input id="sc-fix" defaultValue="€12,50" />
              <p className="text-xs text-muted-foreground">
                Found on the page: “Now only €12,50 incl. VAT.”
              </p>
            </div>
            <div className="mt-6 flex gap-3">
              <Button>Approve</Button>
              <Button variant="ghost">Throw away</Button>
            </div>
          </Card>
        </Section>
      </main>
    </div>
  );
}
