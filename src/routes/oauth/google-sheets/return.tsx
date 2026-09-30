import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/oauth/google-sheets/return")({
  head: () => ({
    meta: [
      { title: "Connecting Google Sheets — Catchbox" },
      { name: "description", content: "Finishing your Google Sheets connection." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SheetsReturn,
});

export type SheetsOAuthMessage =
  | { type: "catchbox:sheets-oauth"; ok: true; code: string; state: string }
  | { type: "catchbox:sheets-oauth"; ok: false; error: string };

/** Google sends the pop-up here; hand the result to the Catchbox window that opened it. */
function SheetsReturn() {
  const [message, setMessage] = useState("Finishing up…");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    const result: SheetsOAuthMessage =
      code && state
        ? { type: "catchbox:sheets-oauth", ok: true, code, state }
        : {
            type: "catchbox:sheets-oauth",
            ok: false,
            error:
              params.get("error") === "access_denied"
                ? "You closed Google before allowing access."
                : "Google didn't finish connecting.",
          };
    if (!result.ok) setMessage(result.error);
    // Same-origin only: the code never reaches another site.
    window.opener?.postMessage(result, window.location.origin);
    window.close();
  }, []);

  return <p className="p-10 text-center text-sm text-muted-foreground">{message}</p>;
}
