"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { CalendarConnection } from "@/lib/integrations/types";
import { integrationErrorMessage } from "@/lib/integrations/errors";
import { AppleConnectGuide } from "@/components/integrations/AppleConnectGuide";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

type AppleConnectSectionProps = {
  connections: CalendarConnection[];
  onConnected?: (connectionId: string) => void;
};

export function AppleConnectSection({
  connections,
  onConnected,
}: AppleConnectSectionProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [appleId, setAppleId] = useState("");
  const [appPassword, setAppPassword] = useState("");
  const [isPending, startTransition] = useTransition();

  const appleConnections = connections.filter((c) => c.provider === "apple");

  function handleDisconnect(connectionId: string) {
    if (!window.confirm("Disconnect this iCloud account and remove linked calendars?")) {
      return;
    }

    startTransition(async () => {
      const response = await fetch("/api/integrations/apple/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId }),
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        showToast(data.error ?? "Disconnect failed", "error");
        return;
      }

      showToast("iCloud account disconnected");
      router.refresh();
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    startTransition(async () => {
      const response = await fetch("/api/integrations/apple/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appleId, appPassword }),
      });
      const data = (await response.json()) as {
        connectionId?: string;
        error?: string;
      };

      if (!response.ok) {
        const message =
          integrationErrorMessage(data.error) ??
          data.error ??
          "Failed to connect iCloud";
        showToast(message, "error");
        return;
      }

      if (!data.connectionId) {
        showToast("Failed to connect iCloud", "error");
        return;
      }

      showToast("iCloud connected — select calendars to import");
      setAppPassword("");
      onConnected?.(data.connectionId);
      router.refresh();
    });
  }

  return (
    <div className="rounded-lg bg-surface/60 px-4 py-4">
      <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-text-secondary">
        Linked: i-Cloud
      </h3>

      {appleConnections.length > 0 ? (
        <ul className="mb-3 space-y-2">
          {appleConnections.map((connection) => (
            <li
              key={connection.id}
              className="flex items-center justify-between gap-2 text-sm text-text-secondary"
            >
              <span>
                {connection.providerAccountEmail}
                {connection.lastSyncStatus === "error" ? (
                  <span className="ml-2 text-[10px] text-red-400">
                    {connection.lastSyncError === "token_revoked"
                      ? "Reconnect required"
                      : "Sync error"}
                  </span>
                ) : null}
              </span>
              <Button
                size="sm"
                variant="ghost"
                disabled={isPending}
                onClick={() => handleDisconnect(connection.id)}
              >
                Disconnect
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-3 text-sm text-text-secondary">
          Connect iCloud Calendar for two-way sync via CalDAV.
        </p>
      )}

      <AppleConnectGuide />

      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
        <Input
          label="Apple ID Email"
          type="email"
          value={appleId}
          onChange={(e) => setAppleId(e.target.value)}
          required
          autoComplete="username"
        />
        <Input
          label="App-Specific Password"
          type="password"
          value={appPassword}
          onChange={(e) => setAppPassword(e.target.value)}
          required
          autoComplete="current-password"
        />
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending
            ? "Connecting…"
            : appleConnections.length > 0
              ? "Connect another iCloud account"
              : "Connect iCloud"}
        </Button>
      </form>
    </div>
  );
}
