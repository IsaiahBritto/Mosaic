"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { getNotifications } from "@/lib/actions/notifications";
import type { NotificationsFeed } from "@/lib/services/notifications.service";
import { FriendRequestsGroup } from "@/components/notifications/FriendRequestsGroup";
import { CalendarInviteGroup } from "@/components/notifications/CalendarInviteGroup";

type NotificationPanelProps = {
  open: boolean;
  onClose: () => void;
};

export function NotificationPanel({ open, onClose }: NotificationPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [feed, setFeed] = useState<NotificationsFeed | null>(null);
  const [isPending, startTransition] = useTransition();

  function loadNotifications() {
    startTransition(async () => {
      const result = await getNotifications();
      if (result.success) {
        setFeed(result.data);
      }
    });
  }

  useEffect(() => {
    if (!open) {
      return;
    }

    loadNotifications();
  }, [open]);

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

  const isEmpty =
    !isPending &&
    feed !== null &&
    feed.friendRequests.length === 0 &&
    feed.calendarInvites.length === 0;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close notifications"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Notifications"
        className="relative z-10 flex h-full w-full max-w-sm flex-col bg-background shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-surface px-4 py-4">
          <h2 className="text-lg font-semibold text-text-primary">Notifications</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-3 py-1.5 text-sm text-text-secondary hover:bg-surface/60"
          >
            Close
          </button>
        </div>
        <div className="flex-1 space-y-6 overflow-y-auto px-4 py-4">
          {isPending && feed === null ? (
            <p className="text-sm text-text-secondary">Loading…</p>
          ) : null}
          {isEmpty ? (
            <p className="text-sm text-text-secondary">No notifications</p>
          ) : null}
          {feed ? (
            <>
              <FriendRequestsGroup
                requests={feed.friendRequests}
                onChanged={loadNotifications}
              />
              <CalendarInviteGroup
                invites={feed.calendarInvites}
                onChanged={loadNotifications}
              />
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
