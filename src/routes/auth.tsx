import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/design-system/catchbox/components/button";
import { Card } from "@/design-system/catchbox/components/card";
import { CatchboxMark } from "@/design-system/catchbox/components/catchbox-mark";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — Catchbox" },
      {
        name: "description",
        content: "Sign in to Catchbox to review failed scrapes and approve clean data.",
      },
      { property: "og:title", content: "Sign in — Catchbox" },
      { property: "og:description", content: "Sign in to Catchbox with your Google account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active && data.session) navigate({ to: "/queue", replace: true });
    });
    return () => {
      active = false;
    };
  }, [navigate]);

  async function handleGoogleSignIn() {
    setIsBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });

    if (result.error) {
      setIsBusy(false);
      toast.error("That didn't work. Please try signing in again.");
      return;
    }

    if (result.redirected) return;

    navigate({ to: "/queue", replace: true });
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="mx-auto w-full max-w-6xl px-5 py-6 lg:px-10">
        <Link to="/" className="flex items-center gap-2">
          <CatchboxMark className="size-7" />
          <span className="font-display text-lg font-semibold">Catchbox</span>
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-5 pb-16">
        <Card className="w-full max-w-md border-border bg-card p-8">
          <h1 className="text-2xl font-semibold">Welcome to Catchbox</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Sign in and your inbox is ready. We'll add a few example catches so you can see how it
            all works before your own scraper sends anything.
          </p>
          <Button onClick={handleGoogleSignIn} disabled={isBusy} size="lg" className="mt-8 w-full">
            {isBusy ? "Opening Google…" : "Continue with Google"}
          </Button>
          <p className="mt-6 text-xs text-muted-foreground">
            Everything you review stays private to your account.
          </p>
        </Card>
      </main>
    </div>
  );
}
