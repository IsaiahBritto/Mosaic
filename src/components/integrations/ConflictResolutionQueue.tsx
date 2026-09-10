"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  getUnresolvedConflicts,
  resolveEventConflict,
  type ConflictEventItem,
} from "@/lib/actions/sync";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { format } from "date-fns";

type ConflictResolutionQueueProps = {
  initialConflicts?: ConflictEventItem[];
  onAllResolved?: () => void;
};

function formatWhen(snapshot: ConflictEventItem["mosaic"]) {
  const start = format(new Date(snapshot.startAt), "MMM d, yyyy h:mm a");
  const end = format(new Date(snapshot.endAt), "h:mm a");
  return snapshot.isAllDay ? "All day" : `${start} – ${end}`;
}

export function ConflictResolutionQueue({
  initialConflicts = [],
  onAllResolved,
}: ConflictResolutionQueueProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [conflicts, setConflicts] = useState(initialConflicts);
  const [resolvedCount, setResolvedCount] = useState(0);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (initialConflicts.length > 0) return;

    void getUnresolvedConflicts().then((result) => {
      if (result.success) {
        setConflicts(result.data);
      }
    });
  }, [initialConflicts.length]);

  useEffect(() => {
    if (conflicts.length === 0 && resolvedCount > 0) {
      onAllResolved?.();
    }
  }, [conflicts.length, resolvedCount, onAllResolved]);

  if (conflicts.length === 0) {
    return null;
  }

  const total = conflicts.length + resolvedCount;

  function handleResolve(eventId: string, choice: "mosaic" | "external") {
    startTransition(async () => {
      const result = await resolveEventConflict({ eventId, choice });
      if (!result.success) {
        showToast(result.message, "error");
        return;
      }

      setConflicts((current) => current.filter((c) => c.eventId !== eventId));
      setResolvedCount((c) => c + 1);
      router.refresh();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl bg-background p-4 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="conflict-queue-title"
      >
        <h2
          id="conflict-queue-title"
          className="mb-1 text-lg font-semibold text-text-primary"
        >
          Resolve sync conflicts
        </h2>
        <p className="mb-4 text-sm text-text-secondary">
          {resolvedCount} of {total} resolved — choose a version for each event.
        </p>

        <div className="flex flex-col gap-4">
          {conflicts.map((conflict) => {
            const externalLabel =
              conflict.provider === "apple" ? "iCloud" : "Google";

            return (
            <div
              key={conflict.eventId}
              className="rounded-lg border border-surface p-3"
            >
              <p className="mb-2 text-sm font-medium text-text-primary">
                {conflict.title}{" "}
                <span className="text-xs font-normal text-text-secondary">
                  ({conflict.calendarName})
                </span>
              </p>

              <div className="mb-3 grid gap-2 text-xs sm:grid-cols-2">
                <div className="rounded bg-surface/60 p-2">
                  <p className="mb-1 font-bold uppercase text-text-secondary">
                    Mosaic
                  </p>
                  <p>{conflict.mosaic.title}</p>
                  <p className="text-text-secondary">
                    {formatWhen(conflict.mosaic)}
                  </p>
                </div>
                <div className="rounded bg-surface/60 p-2">
                  <p className="mb-1 font-bold uppercase text-text-secondary">
                    {externalLabel}
                  </p>
                  <p>{conflict.external.title}</p>
                  <p className="text-text-secondary">
                    {formatWhen(conflict.external)}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  disabled={isPending}
                  onClick={() => handleResolve(conflict.eventId, "mosaic")}
                >
                  Keep Mosaic
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isPending}
                  onClick={() => handleResolve(conflict.eventId, "external")}
                >
                  Keep {externalLabel}
                </Button>
              </div>
            </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
