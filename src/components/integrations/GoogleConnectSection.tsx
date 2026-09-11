"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { CalendarConnection } from "@/lib/integrations/types";
import { disconnectGoogleConnection } from "@/lib/actions/integrations";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

type GoogleConnectSectionProps = {
  connections: CalendarConnection[];
};

export function GoogleConnectSection({ connections }: GoogleConnectSectionProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();

  const googleConnections = connections.filter((c) => c.provider === "google");

  function handleDisconnect(connectionId: string) {
    if (!window.confirm("Disconnect this Google account and remove linked calendars?")) {
      return;
    }

    startTransition(async () => {
      const result = await disconnectGoogleConnection(connectionId);
      if (!result.success) {
        showToast(result.message, "error");
        return;
      }
      showToast("Google account disconnected");
      router.refresh();
    });
  }

  return (
    <div className="rounded-lg bg-surface/60 px-4 py-4">
      <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-text-secondary">
        Linked: Google
      </h3>

      {googleConnections.length > 0 ? (
        <ul className="mb-3 space-y-2">
          {googleConnections.map((connection) => (
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
              <div className="flex shrink-0 gap-2">
                <Link
                  href={`/api/integrations/google/connect?connectionId=${encodeURIComponent(connection.id)}`}
                  className="text-xs uppercase text-accent hover:underline"
                >
                  Reconnect
                </Link>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={isPending}
                  onClick={() => handleDisconnect(connection.id)}
                >
                  Disconnect
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-3 text-sm text-text-secondary">
          Connect Google Calendar for two-way sync.
        </p>
      )}

      <Link href="/api/integrations/google/connect">
        <Button size="sm">
          {googleConnections.length > 0 ? "Connect another Google account" : "Connect Google"}
        </Button>
      </Link>
    </div>
  );
}
