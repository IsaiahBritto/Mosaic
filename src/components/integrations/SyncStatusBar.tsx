"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { resyncAllLinkedCalendars } from "@/lib/actions/integrations";
import type { CalendarConnection } from "@/lib/integrations/types";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

type SyncStatusBarProps = {
  connections: CalendarConnection[];
  onSyncComplete?: (conflictCount: number) => void;
};

function formatLastSync(iso: string | null): string {
  if (!iso) return "Never synced";
  return `Last synced ${new Date(iso).toLocaleString()}`;
}

export function SyncStatusBar({
  connections,
  onSyncComplete,
}: SyncStatusBarProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();

  if (connections.length === 0) {
    return null;
  }

  function handleSync() {
    startTransition(async () => {
      const result = await resyncAllLinkedCalendars();
      if (!result.success) {
        showToast(result.message, "error");
        return;
      }

      const { conflicts, pulled, pushed } = result.data;
      if (conflicts.length > 0) {
        showToast(`${conflicts.length} conflict(s) need your attention`, "error");
        onSyncComplete?.(conflicts.length);
      } else {
        showToast(`Resync complete (${pulled} pulled, ${pushed} pushed)`);
      }
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
              {formatLastSync(connection.lastSyncAt)}
              {connection.lastSyncStatus === "error" ? (
                <span className="ml-1 text-red-400">
                  ({connection.lastSyncError ?? "error"})
                </span>
              ) : null}
            </p>
          ))}
        </div>
        <Button size="sm" onClick={handleSync} disabled={isPending}>
          {isPending ? "Syncing…" : "Resync all calendars"}
        </Button>
      </div>
    </div>
  );
}
