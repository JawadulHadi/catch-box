import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Mail } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import {
  isSupabaseConfigured,
  missingSupabaseEnv,
  supabasePublishableKey,
  supabaseUrl,
} from "@/integrations/supabase/env";
import { Alert, AlertDescription } from "@/design-system/catchbox/components/alert";
import { Button } from "@/design-system/catchbox/components/button";
import { Card } from "@/design-system/catchbox/components/card";
import { CatchboxMark } from "@/design-system/catchbox/components/catchbox-mark";
import { Input } from "@/design-system/catchbox/components/input";
import { Label } from "@/design-system/catchbox/components/label";
import { AppearanceMenu } from "@/components/appearance-menu";
import { getSessionUser } from "@/lib/session";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): { error?: string } =>
    typeof search["error"] === "string" ? { error: search["error"].slice(0, 300) } : {},
  beforeLoad: async () => {
    if (await getSessionUser()) throw redirect({ to: "/queue" });
  },
  head: () => ({
    meta: [
      { title: "Sign in — Catchbox" },
      {
        name: "description",
        content: "Sign in to Catchbox to review failed scrapes and approve clean data.",
      },
      { property: "og:title", content: "Sign in — Catchbox" },
      { property: "og:description", content: "Sign in to Catchbox." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

/** Which sign-in methods the Supabase project has switched on. */
async function fetchProviders(): Promise<{ google: boolean; email: boolean }> {
  const response = await fetch(`${supabaseUrl()}/auth/v1/settings`, {
    headers: { apikey: supabasePublishableKey() ?? "" },
  });
  if (!response.ok) throw new Error(`Auth settings answered ${response.status}`);
  const settings = (await response.json()) as { external?: Record<string, boolean> };
  return {
    google: settings.external?.["google"] === true,
    email: settings.external?.["email"] === true,
  };
}

function callbackUrl(): string {
  return `${window.location.origin}/auth/callback`;
}

function AuthPage() {
  const { error: linkError } = Route.useSearch();
  const configured = isSupabaseConfigured();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-6 lg:px-10">
        <Link to="/" className="flex items-center gap-2">
          <CatchboxMark className="size-7" />
          <span className="font-display text-lg font-semibold">Catchbox</span>
        </Link>
        <AppearanceMenu align="end" className="text-muted-foreground" />
      </header>

      <main className="flex flex-1 items-center justify-center px-5 pb-16">
        {configured ? (
          <SignIn linkError={linkError} />
        ) : (
          <SetupNeeded missing={missingSupabaseEnv()} />
        )}
      </main>
    </div>
  );
}

function SignIn({ linkError }: { linkError: string | undefined }) {
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [busy, setBusy] = useState<"google" | "email" | null>(null);
  const providers = useQuery({ queryKey: ["auth-providers"], queryFn: fetchProviders });

  async function handleGoogle() {
    setBusy("google");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl() },
    });
    if (error) {
      setBusy(null);
      toast.error("Google sign-in didn't start. Please try again.");
    }
  }

  async function handleEmail(event: FormEvent) {
    event.preventDefault();
    setBusy("email");
    const address = email.trim();
    const { error } = await supabase.auth.signInWithOtp({
      email: address,
      options: { emailRedirectTo: callbackUrl() },
    });
    setBusy(null);
    if (!error) {
      setSentTo(address);
      return;
    }
    if (error.status === 429) {
      toast.error("Too many sign-in emails were sent recently. Wait a few minutes and try again.");
    } else {
      toast.error(error.message || "We couldn't send that email. Please try again.");
    }
  }

  return (
    <Card className="w-full max-w-md border-border bg-card p-8">
      <h1 className="text-2xl font-semibold">Welcome to Catchbox</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        Sign in and your inbox is ready. We'll add a few example catches so you can see how it all
        works before your own scraper sends anything.
      </p>

      {linkError ? (
        <Alert variant="destructive" className="mt-6">
          <AlertDescription>{linkError}</AlertDescription>
        </Alert>
      ) : null}

      {providers.data?.google ? (
        <>
          <Button onClick={handleGoogle} disabled={busy !== null} size="lg" className="mt-8 w-full">
            {busy === "google" ? "Opening Google…" : "Continue with Google"}
          </Button>
          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            or
            <span className="h-px flex-1 bg-border" />
          </div>
        </>
      ) : (
        <div className="mt-8" />
      )}

      {sentTo ? (
        <div className="rounded-lg border border-border bg-surface p-4 text-sm">
          <p className="flex items-center gap-2 font-medium">
            <Mail className="size-4 text-primary" />
            Check your inbox
          </p>
          <p className="mt-2 text-muted-foreground">
            We sent a sign-in link to <span className="text-foreground">{sentTo}</span>. Open it in
            this browser.
          </p>
          <Button variant="link" className="mt-1 h-auto p-0" onClick={() => setSentTo(null)}>
            Use a different email
          </Button>
        </div>
      ) : (
        <form onSubmit={handleEmail} className="grid gap-3">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
          />
          <Button
            type="submit"
            variant={providers.data?.google ? "outline" : "default"}
            disabled={busy !== null}
          >
            {busy === "email" ? "Sending…" : "Email me a sign-in link"}
          </Button>
        </form>
      )}

      <p className="mt-6 text-xs text-muted-foreground">
        Everything you review stays private to your account.
      </p>
    </Card>
  );
}

function SetupNeeded({ missing }: { missing: string[] }) {
  return (
    <Card className="w-full max-w-lg border-warning/40 p-8">
      <h1 className="text-2xl font-semibold">Catchbox isn't connected to its database</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        Sign-in needs these settings, and they're empty:
      </p>
      <ul className="mt-3 space-y-1 font-mono text-sm">
        {missing.map((name) => (
          <li key={name}>{name}</li>
        ))}
      </ul>
      <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
        Copy <code className="font-mono text-foreground">.env.example</code> to{" "}
        <code className="font-mono text-foreground">.env</code>, fill them in, then restart{" "}
        <code className="font-mono text-foreground">bun run dev</code>. Run{" "}
        <code className="font-mono text-foreground">bun run check-env</code> to see everything
        that's still missing.
      </p>
    </Card>
  );
}
