import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/oauth/google-sheets/return")({
  head: () => ({
    meta: [
      { title: "Connecting Google Sheets — Catchbox" },
      { name: "description", content: "Finishing your Google Sheets connection." },
      { property: "og:title", content: "Connecting Google Sheets — Catchbox" },
      { property: "og:description", content: "Finishing your Google Sheets connection." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SheetsReturn,
});

function SheetsReturn() {
  const [message, setMessage] = useState("Finishing up…");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const notify = (type: "appUserConnectorOAuthComplete" | "appUserConnectorOAuthFailed", code?: string) => {
      window.opener?.postMessage(
        { type, connectorId: "google_sheets", code: code ?? null },
        window.location.origin,
      );
      window.close();
    };
    if (params.get("success") !== "true") {
      setMessage(params.get("error") ?? "Google didn't finish connecting.");
      notify("appUserConnectorOAuthFailed");
      return;
    }
    const code = params.get("code");
    if (!code) {
      setMessage("Google didn't send back what we needed. Please try again.");
      notify("appUserConnectorOAuthFailed");
      return;
    }
    notify("appUserConnectorOAuthComplete", code);
  }, []);

  return <p className="p-10 text-center text-sm text-muted-foreground">{message}</p>;
}
