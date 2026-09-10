"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { getFriends } from "@/lib/actions/friends";
import { getSentInvites, inviteToCalendar } from "@/lib/actions/sharing";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

type ShareWithFriendSectionProps = {
  calendarId: string;
};

type FriendOption = {
  id: string;
  displayName: string;
};

type PendingInvite = {
  id: string;
  invitedEmail: string | null;
  role: string;
};

export function ShareWithFriendSection({ calendarId }: ShareWithFriendSectionProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [friends, setFriends] = useState<FriendOption[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [friendUserId, setFriendUserId] = useState("");
  const [role, setRole] = useState<"editor" | "viewer">("editor");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    startTransition(async () => {
      const [friendsResult, invitesResult] = await Promise.all([
        getFriends(),
        getSentInvites(calendarId),
      ]);

      if (friendsResult.success) {
        setFriends(
          friendsResult.data.map((friend) => ({
            id: friend.id,
            displayName: friend.displayName,
          })),
        );
      }

      if (invitesResult.success) {
        setPendingInvites(
          invitesResult.data.map((invite) => ({
            id: invite.id,
            invitedEmail: invite.invited_email,
            role: invite.role,
          })),
        );
      }

      setLoaded(true);
    });
  }, [calendarId]);

  function reloadInvites() {
    startTransition(async () => {
      const invitesResult = await getSentInvites(calendarId);
      if (invitesResult.success) {
        setPendingInvites(
          invitesResult.data.map((invite) => ({
            id: invite.id,
            invitedEmail: invite.invited_email,
            role: invite.role,
          })),
        );
      }
      router.refresh();
    });
  }

  function handleShare() {
    if (!friendUserId) {
      showToast("Select a friend", "error");
      return;
    }

    startTransition(async () => {
      const result = await inviteToCalendar({
        calendarId,
        friendUserId,
        role,
      });

      if (!result.success) {
        showToast(result.message, "error");
        return;
      }

      showToast("Calendar invite sent");
      setFriendUserId("");
      reloadInvites();
    });
  }

  if (!loaded && isPending) {
    return <p className="text-sm text-text-secondary">Loading friends…</p>;
  }

  return (
    <section className="mb-4 space-y-3 border-t border-surface pt-4">
      <div>
        <h3 className="text-xs font-bold uppercase tracking-widest text-text-secondary">
          Share with friend
        </h3>
        <p className="mt-1 text-xs text-text-secondary">
          Only friends can be invited to this calendar.
        </p>
      </div>

      {friends.length === 0 ? (
        <p className="text-sm text-text-secondary">
          Add friends from your profile to share calendars.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-text-secondary">Friend</span>
            <select
              value={friendUserId}
              onChange={(event) => setFriendUserId(event.target.value)}
              className="rounded-lg border border-text-secondary/30 bg-background px-3 py-2 text-sm text-text-primary"
            >
              <option value="">Select a friend</option>
              {friends.map((friend) => (
                <option key={friend.id} value={friend.id}>
                  {friend.displayName}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-text-secondary">Role</span>
            <select
              value={role}
              onChange={(event) => setRole(event.target.value as "editor" | "viewer")}
              className="rounded-lg border border-text-secondary/30 bg-background px-3 py-2 text-sm text-text-primary"
            >
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
            </select>
          </label>

          <Button
            type="button"
            size="sm"
            disabled={isPending || !friendUserId}
            onClick={handleShare}
          >
            {isPending ? "Sending…" : "Send invite"}
          </Button>
        </div>
      )}

      {pendingInvites.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide text-text-secondary">
            Pending invites
          </p>
          <ul className="space-y-1 text-sm text-text-primary">
            {pendingInvites.map((invite) => (
              <li key={invite.id}>
                {invite.invitedEmail ?? "Friend"}{" "}
                <span className="text-text-secondary">({invite.role})</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
