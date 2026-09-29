import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  Inbox,
  Database,
  Radar,
  Plug,
  LogOut,
  Activity,
  Wrench,
  BarChart3,
  Palette,
} from "lucide-react";
import { ThemeToggle } from "@/design-system/catchbox/components/theme-toggle";
import type { ReactNode } from "react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/design-system/catchbox/components/button";
import { CatchboxMark } from "@/design-system/catchbox/components/catchbox-mark";

const navItems = [
  { to: "/queue", label: "Needs a quick look", icon: Inbox },
  { to: "/data", label: "Approved data", icon: Database },
  { to: "/scrapers", label: "Your scrapers", icon: Radar },
  { to: "/status", label: "Live status", icon: Activity },
  { to: "/history", label: "Scraper history", icon: BarChart3 },
  { to: "/builder", label: "Build a scraper", icon: Wrench },
  { to: "/connect", label: "Connect your scraper", icon: Plug },
] as const;

type AppShellProps = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
};

export function AppShell({ title, subtitle, actions, children }: AppShellProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background lg:flex">
      <aside className="border-b border-border bg-sidebar lg:min-h-screen lg:w-64 lg:shrink-0 lg:border-r lg:border-b-0">
        <div className="flex items-center justify-between gap-4 px-5 py-4 lg:block">
          <Link to="/queue" className="flex items-center gap-2">
            <CatchboxMark className="size-7" />
            <span className="font-display text-lg font-semibold">Catchbox</span>
          </Link>
          <nav className="hidden gap-1 lg:mt-8 lg:flex lg:flex-col">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
                activeProps={{ className: "bg-sidebar-accent text-foreground font-medium" }}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex gap-1 lg:mt-8 lg:flex-col">
            <ThemeToggle className="text-muted-foreground lg:w-full lg:justify-start" />
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="text-muted-foreground lg:w-full lg:justify-start"
            >
              <Link to="/showcase">
                <Palette className="size-4" />
                Look and feel
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="text-muted-foreground lg:w-full lg:justify-start"
            >
              <LogOut className="size-4" />
              Sign out
            </Button>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:hidden">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="shrink-0 rounded-lg px-3 py-2 text-sm text-muted-foreground"
              activeProps={{ className: "bg-sidebar-accent text-foreground font-medium" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-5 py-8 lg:px-10 lg:py-12">
          <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold lg:text-3xl">{title}</h1>
              {subtitle ? (
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{subtitle}</p>
              ) : null}
            </div>
            {actions}
          </header>
          {children}
        </div>
      </main>
    </div>
  );
}
