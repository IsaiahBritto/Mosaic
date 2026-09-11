"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  getCalendarSharingDetails,
  leaveCalendar,
  removeMember,
} from "@/lib/actions/sharing";
import type { CalendarSharingDetails } from "@/lib/services/sharing.service";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils/cn";

type SharedCalendarPanelProps = {
  calendarId: string | null;
  calendarName?: string;
  onClose: () => void;
};

export function SharedCalendarPanel({
  calendarId,
  calendarName,
  onClose,
}: SharedCalendarPanelProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const panelRef = useRef<HTMLDivElement>(null);
  const [details, setDetails] = useState<CalendarSharingDetails | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, startLoadTransition] = useTransition();
  const [isPending, startActionTransition] = useTransition();

  const open = calendarId != null;

  useEffect(() => {
    if (!calendarId) {
      setDetails(null);
      setLoadError(null);
      return;
    }

    startLoadTransition(async () => {
      const result = await getCalendarSharingDetails({ calendarId });
      if (!result.success) {
        setDetails(null);
        setLoadError(result.message);
        return;
      }
      setDetails(result.data);
      setLoadError(null);
    });
  }, [calendarId]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      panelRef.current?.focus();
    }
  }, [open]);

  if (!open) {
    return null;
  }

  function handleRemoveMember(memberId: string, memberName: string) {
    if (!calendarId) {
      return;
    }

    const confirmed = window.confirm(
      `Remove ${memberName} from this calendar? They will lose access.`,
    );
    if (!confirmed) {
      return;
    }

    startActionTransition(async () => {
      const result = await removeMember({ calendarId, memberId });
      if (!result.success) {
        showToast(result.message, "error");
        return;
      }
      showToast("Member removed");
      onClose();
      router.refresh();
    });
  }

  function handleLeave() {
    if (!calendarId) {
      return;
    }

    const confirmed = window.confirm(
      "Leave this shared calendar? You will lose access.",
    );
    if (!confirmed) {
      return;
    }

    startActionTransition(async () => {
      const result = await leaveCalendar({ calendarId });
      if (!result.success) {
        showToast(result.message, "error");
        return;
      }
      showToast("You left the calendar");
      onClose();
      router.refresh();
    });
  }

  const title = details?.calendarName ?? calendarName ?? "Shared calendar";

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close sharing details"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Calendar sharing details"
        className="relative z-10 flex h-full w-full max-w-sm flex-col bg-background shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-surface px-4 py-4">
          <div className="min-w-0 pr-4">
            <h2 className="truncate text-lg font-semibold text-text-primary">{title}</h2>
            <p className="text-sm text-text-secondary">Sharing</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full px-3 py-1.5 text-sm text-text-secondary hover:bg-surface/60"
          >
            Close
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-4 py-4">
          {isLoading && !details ? (
            <p className="text-sm text-text-secondary">Loading…</p>
          ) : null}

          {loadError ? (
            <p className="text-sm text-status-busy">{loadError}</p>
          ) : null}

          {details ? (
            <>
              <section className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wide text-text-secondary">
                  Owner
                </h3>
                <p className="rounded-lg bg-surface/40 px-3 py-2 text-sm text-text-primary">
                  {details.owner.displayName}
                  {details.owner.userId === details.currentUserId ? " (you)" : ""}
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wide text-text-secondary">
                  Shared with
                </h3>
                {details.members.length === 0 ? (
                  <p className="text-sm text-text-secondary">No members yet</p>
                ) : (
                  <ul className="space-y-2">
                    {details.members.map((member) => {
                      const isSelf = member.userId === details.currentUserId;
                      const canRemove =
                        details.isOwner ||
                        (isSelf && !details.isOwner);

                      return (
                        <li
                          key={member.memberId}
                          className="flex items-center justify-between gap-2 rounded-lg bg-surface/40 px-3 py-2 text-sm"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-text-primary">
                              {member.displayName}
                              {isSelf ? " (you)" : ""}
                            </p>
                            <p className="text-xs uppercase tracking-wide text-text-secondary">
                              {member.role}
                            </p>
                          </div>
                          {canRemove ? (
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() =>
                                details.isOwner
                                  ? handleRemoveMember(member.memberId, member.displayName)
                                  : handleLeave()
                              }
                              className={cn(
                                "shrink-0 text-xs uppercase hover:underline disabled:opacity-50",
                                details.isOwner
                                  ? "text-status-busy"
                                  : "text-text-secondary",
                              )}
                            >
                              {details.isOwner ? "Remove" : "Remove myself"}
                            </button>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
