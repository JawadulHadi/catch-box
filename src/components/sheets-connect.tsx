import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ExternalLink, Sheet } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/design-system/catchbox/components/button";
import { Card } from "@/design-system/catchbox/components/card";
import { formatDate } from "@/lib/format";
import {
  completeSheetsConnect,
  disconnectSheets,
  getSheetStatus,
  startSheetsConnect,
} from "@/lib/sheets.functions";
import type { SheetsOAuthMessage } from "@/routes/oauth/google-sheets/return";

function waitForPopup(popup: Window): Promise<{ code: string; state: string }> {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      window.removeEventListener("message", onMessage);
      window.clearInterval(poll);
    };
    const onMessage = (event: MessageEvent<SheetsOAuthMessage>) => {
      if (
        event.origin !== window.location.origin ||
        event.source !== popup ||
        event.data?.type !== "catchbox:sheets-oauth"
      )
        return;
      cleanup();
      if (event.data.ok) resolve({ code: event.data.code, state: event.data.state });
      else {
        popup.close();
        reject(new Error(event.data.error));
      }
    };
    window.addEventListener("message", onMessage);
    const poll = window.setInterval(() => {
      if (!popup.closed) return;
      cleanup();
      reject(new Error("The Google window closed before you finished."));
    }, 500);
  });
}

export function SheetsConnect() {
  const queryClient = useQueryClient();
  const fetchStatus = useServerFn(getSheetStatus);
  const start = useServerFn(startSheetsConnect);
  const complete = useServerFn(completeSheetsConnect);
  const disconnect = useServerFn(disconnectSheets);

  const { data: status } = useQuery({ queryKey: ["sheet-status"], queryFn: () => fetchStatus() });

  const connect = useMutation({
    mutationFn: async () => {
      const popup = window.open("", "catchbox-google", "width=600,height=720");
      if (!popup) throw new Error("Your browser blocked the pop-up. Allow pop-ups and try again.");
      let result: { code: string; state: string };
      try {
        const { authorizationUrl } = await start();
        const done = waitForPopup(popup);
        popup.location.href = authorizationUrl;
        result = await done;
      } catch (error) {
        popup.close();
        throw error;
      }
      return complete({ data: result });
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["sheet-status"] });
      toast.success(
        result.status === "synced"
          ? `Connected. Your sheet has ${result.rows} ${result.rows === 1 ? "row" : "rows"}.`
          : "Connected to Google Sheets.",
      );
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const unlink = useMutation({
    mutationFn: () => disconnect(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sheet-status"] });
      toast.success("Google Sheets disconnected. Your sheet stays in your Google Drive.");
    },
    onError: () => toast.error("We couldn't disconnect right now. Please try again."),
  });

  return (
    <Card className="mb-6 flex flex-wrap items-center justify-between gap-4 border-border bg-card p-5">
      <div className="flex items-start gap-3">
        <Sheet className="mt-0.5 size-5 text-primary" />
        <div>
          <h2 className="text-sm font-semibold">Live Google Sheet</h2>
          <p className="text-sm text-muted-foreground">
            {status && !status.available
              ? "Google Sheets isn't set up on this server yet. Everything else works; CSV download is always available."
              : status?.connected
                ? status.lastError
                  ? "Last update didn't go through — it'll try again on your next approval."
                  : status.lastSyncedAt
                    ? `Updates every time you approve. Last updated ${formatDate(status.lastSyncedAt)}.`
                    : "Connected. Your sheet updates every time you approve."
                : "Connect your Google account and every approval lands in your own sheet automatically."}
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        {status?.connected && status.url ? (
          <Button asChild variant="outline" size="sm">
            <a href={status.url} target="_blank" rel="noreferrer">
              <ExternalLink className="size-4" />
              Open sheet
            </a>
          </Button>
        ) : null}
        {status?.connected ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => unlink.mutate()}
            disabled={unlink.isPending}
          >
            Disconnect
          </Button>
        ) : status?.available === false ? null : (
          <Button
            size="sm"
            onClick={() => connect.mutate()}
            disabled={connect.isPending || !status}
          >
            {connect.isPending ? "Connecting…" : "Connect Google Sheets"}
          </Button>
        )}
      </div>
    </Card>
  );
}
