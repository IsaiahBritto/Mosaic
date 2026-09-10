"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  cancelFriendRequest,
  getFriends,
  getSentFriendRequests,
  removeFriend,
  sendFriendRequest,
} from "@/lib/actions/friends";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";

type FriendItem = {
  id: string;
  displayName: string;
};

type SentRequestItem = {
  id: string;
  recipientEmail: string;
};

type FriendsSectionProps = {
  active: boolean;
};

export function FriendsSection({ active }: FriendsSectionProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [sentRequests, setSentRequests] = useState<SentRequestItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!active || loaded) {
      return;
    }

    startTransition(async () => {
      const [friendsResult, sentResult] = await Promise.all([
        getFriends(),
        getSentFriendRequests(),
      ]);

      if (friendsResult.success) {
        setFriends(
          friendsResult.data.map((friend) => ({
            id: friend.id,
            displayName: friend.displayName,
          })),
        );
      }

      if (sentResult.success) {
        setSentRequests(
          sentResult.data.map((request) => ({
            id: request.id,
            recipientEmail: request.recipientEmail,
          })),
        );
      }

      setLoaded(true);
    });
  }, [active, loaded]);

  function reloadFriendsData() {
    startTransition(async () => {
      const [friendsResult, sentResult] = await Promise.all([
        getFriends(),
        getSentFriendRequests(),
      ]);

      if (friendsResult.success) {
        setFriends(
          friendsResult.data.map((friend) => ({
            id: friend.id,
            displayName: friend.displayName,
          })),
        );
      }

      if (sentResult.success) {
        setSentRequests(
          sentResult.data.map((request) => ({
            id: request.id,
            recipientEmail: request.recipientEmail,
          })),
        );
      }

      router.refresh();
    });
  }

  function handleSendRequest(event: React.FormEvent) {
    event.preventDefault();
    if (!email.trim()) {
      return;
    }

    startTransition(async () => {
      const result = await sendFriendRequest({ email: email.trim() });
      if (!result.success) {
        showToast(result.message, "error");
        return;
      }

      showToast("Friend request sent");
      setEmail("");
      reloadFriendsData();
    });
  }

  function handleRemoveFriend(friendId: string) {
    startTransition(async () => {
      const result = await removeFriend({ friendId });
      if (!result.success) {
        showToast(result.message, "error");
        return;
      }

      showToast("Friend removed");
      reloadFriendsData();
    });
  }

  function handleCancelRequest(requestId: string) {
    startTransition(async () => {
      const result = await cancelFriendRequest({ requestId });
      if (!result.success) {
        showToast(result.message, "error");
        return;
      }

      showToast("Friend request cancelled");
      reloadFriendsData();
    });
  }

  return (
    <section className="space-y-6 border-t border-surface pt-6">
      <div>
        <h3 className="text-sm font-semibold text-text-primary">Friends</h3>
        <p className="mt-1 text-xs text-text-secondary">
          Send a request by email. They&apos;ll see it when they log in.
        </p>
      </div>

      <form onSubmit={handleSendRequest} className="flex flex-col gap-3">
        <Input
          label="Add friend by email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="friend@example.com"
        />
        <Button type="submit" size="md" disabled={isPending || !email.trim()}>
          {isPending ? "Sending…" : "Send request"}
        </Button>
      </form>

      {sentRequests.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide text-text-secondary">
            Sent requests
          </p>
          <ul className="space-y-2">
            {sentRequests.map((request) => (
              <li
                key={request.id}
                className="flex items-center justify-between gap-2 rounded-lg bg-surface/40 px-3 py-2 text-sm"
              >
                <span className="text-text-primary">{request.recipientEmail}</span>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleCancelRequest(request.id)}
                  className="text-xs uppercase text-text-secondary hover:underline disabled:opacity-50"
                >
                  Cancel
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-wide text-text-secondary">
          Your friends
        </p>
        {!loaded && isPending ? (
          <p className="text-sm text-text-secondary">Loading…</p>
        ) : null}
        {loaded && friends.length === 0 ? (
          <p className="text-sm text-text-secondary">No friends yet</p>
        ) : null}
        {friends.length > 0 ? (
          <ul className="space-y-2">
            {friends.map((friend) => (
              <li
                key={friend.id}
                className="flex items-center justify-between gap-2 rounded-lg bg-surface/40 px-3 py-2 text-sm"
              >
                <span className="text-text-primary">{friend.displayName}</span>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleRemoveFriend(friend.id)}
                  className="text-xs uppercase text-text-secondary hover:underline disabled:opacity-50"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
