"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { syncNow } from "@/lib/actions/integrations";
import type { CalendarConnection } from "@/lib/integrations/types";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

type SyncStatusBarProps = {
  connections: CalendarConnection[];
};

export function SyncStatusBar({ connections }: SyncStatusBarProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();

  if (connections.length === 0) {
    return null;
  }

  function handleSync() {
    startTransition(async () => {
      const result = await syncNow();
      if (!result.success) {
        showToast(result.message, "error");
        return;
      }
      showToast("Sync complete");
      router.refresh();
    });
  }

  return (
    <div className="border-b border-surface px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs text-text-secondary">
          {connections.map((connection) => (
            <p key={connection.id}>
              {connection.provider}: {connection.providerAccountEmail}{" "}
              {connection.lastSyncStatus ? `(${connection.lastSyncStatus})` : ""}
            </p>
          ))}
        </div>
        <Button size="sm" onClick={handleSync} disabled={isPending}>
          {isPending ? "Syncing…" : "Sync Now"}
        </Button>
      </div>
    </div>
  );
}
