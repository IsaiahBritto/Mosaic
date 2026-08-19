"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { acceptInvite, declineInvite } from "@/lib/actions/sharing";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

type InviteAcceptCardProps = {
  token: string;
  calendarName: string;
  role: string;
  emailMismatch?: boolean;
  invitedEmail?: string;
  userEmail?: string;
};

export function InviteAcceptCard({
  token,
  calendarName,
  role,
  emailMismatch,
  invitedEmail,
  userEmail,
}: InviteAcceptCardProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();

  if (emailMismatch) {
    return (
      <div className="mx-4 rounded-lg bg-surface px-4 py-6 text-center">
        <p className="text-sm text-text-primary">
          This invite was sent to {invitedEmail}.
        </p>
        <p className="mt-2 text-sm text-text-secondary">
          You are signed in as {userEmail}.
        </p>
      </div>
    );
  }

  function handleAccept() {
    startTransition(async () => {
      const result = await acceptInvite({ token });
      if (!result.success) {
        showToast(result.message, "error");
        return;
      }
      showToast(`Joined "${calendarName}"`);
      router.push("/month");
      router.refresh();
    });
  }

  function handleDecline() {
    startTransition(async () => {
      const result = await declineInvite({ token });
      if (!result.success) {
        showToast(result.message, "error");
        return;
      }
      showToast("Invite declined");
      router.push("/month");
    });
  }

  return (
    <div className="mx-4 rounded-lg bg-surface px-4 py-6">
      <h2 className="text-center text-sm font-bold uppercase tracking-wide text-text-secondary">
        Calendar Invite
      </h2>
      <p className="mt-4 text-center text-lg text-text-primary">{calendarName}</p>
      <p className="mt-2 text-center text-sm text-text-secondary">
        Role: {role}
      </p>
      <div className="mt-6 flex flex-col gap-3">
        <Button onClick={handleAccept} disabled={isPending}>
          Accept
        </Button>
        <Button variant="outline" onClick={handleDecline} disabled={isPending}>
          Decline
        </Button>
      </div>
    </div>
  );
}
