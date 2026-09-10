"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  acceptFriendRequest,
  declineFriendRequest,
} from "@/lib/actions/friends";
import { useToast } from "@/components/ui/Toast";
import type { FriendRequestNotification } from "@/lib/services/notifications.service";

type FriendRequestsGroupProps = {
  requests: FriendRequestNotification[];
  onChanged?: () => void;
};

export function FriendRequestsGroup({ requests, onChanged }: FriendRequestsGroupProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState(true);

  if (requests.length === 0) {
    return null;
  }

  function handleAccept(requestId: string) {
    startTransition(async () => {
      const result = await acceptFriendRequest({ requestId });
      if (!result.success) {
        showToast(result.message, "error");
        return;
      }
      showToast("Friend request accepted");
      router.refresh();
      onChanged?.();
    });
  }

  function handleDecline(requestId: string) {
    startTransition(async () => {
      const result = await declineFriendRequest({ requestId });
      if (!result.success) {
        showToast(result.message, "error");
        return;
      }
      showToast("Friend request declined");
      router.refresh();
      onChanged?.();
    });
  }

  const header =
    requests.length === 1
      ? "Friend request"
      : `Friend requests (${requests.length})`;

  return (
    <section className="space-y-2">
      {requests.length > 1 ? (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="flex w-full items-center justify-between text-xs font-bold uppercase tracking-wide text-accent"
        >
          <span>{header}</span>
          <span aria-hidden>{expanded ? "−" : "+"}</span>
        </button>
      ) : (
        <p className="text-xs font-bold uppercase tracking-wide text-accent">
          {header}
        </p>
      )}

      {expanded ? (
        <ul className="space-y-2">
          {requests.map((request) => (
            <li
              key={request.id}
              className="flex items-center justify-between gap-2 rounded-lg bg-surface/40 px-3 py-2 text-sm"
            >
              <span className="text-text-primary">{request.requesterName}</span>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleAccept(request.id)}
                  className="text-xs uppercase text-accent hover:underline disabled:opacity-50"
                >
                  Accept
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleDecline(request.id)}
                  className="text-xs uppercase text-text-secondary hover:underline disabled:opacity-50"
                >
                  Decline
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
