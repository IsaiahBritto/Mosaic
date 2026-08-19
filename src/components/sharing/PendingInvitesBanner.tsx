"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { acceptInvite } from "@/lib/actions/sharing";
import { useToast } from "@/components/ui/Toast";

type PendingInvitesBannerProps = {
  invites: Array<{
    token: string;
    calendarName: string;
    role: string;
  }>;
};

export function PendingInvitesBanner({ invites }: PendingInvitesBannerProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();

  if (invites.length === 0) {
    return null;
  }

  function handleQuickAccept(token: string) {
    startTransition(async () => {
      const result = await acceptInvite({ token });
      if (!result.success) {
        showToast(result.message, "error");
        return;
      }
      showToast("Invite accepted");
      router.refresh();
    });
  }

  return (
    <div className="border-b border-accent/30 bg-accent/10 px-4 py-3">
      <p className="text-xs font-bold uppercase tracking-wide text-accent">
        Pending Invites
      </p>
      <ul className="mt-2 space-y-2">
        {invites.map((invite) => (
          <li key={invite.token} className="flex items-center justify-between gap-2 text-sm">
            <span className="text-text-primary">
              {invite.calendarName}{" "}
              <span className="text-text-secondary">({invite.role})</span>
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleQuickAccept(invite.token)}
                className="text-xs uppercase text-accent hover:underline"
              >
                Accept
              </button>
              <Link
                href={`/invites/${invite.token}`}
                className="text-xs uppercase text-text-secondary hover:underline"
              >
                View
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
