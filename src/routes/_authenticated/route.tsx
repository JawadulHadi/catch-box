import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { getSessionUser } from "@/lib/session";

export const Route = createFileRoute("/_authenticated")({
  // Runs on the server for the first page load, so a signed-out visit gets a plain
  // redirect instead of a page that renders and then changes its mind.
  beforeLoad: async () => {
    const user = await getSessionUser();
    if (!user) throw redirect({ to: "/auth" });
    return { user };
  },
  component: () => <Outlet />,
});
