"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { acceptInvite, declineInvite } from "@/lib/actions/sharing";
import { useToast } from "@/components/ui/Toast";
import type { CalendarInviteNotification } from "@/lib/services/notifications.service";

type CalendarInviteGroupProps = {
  invites: CalendarInviteNotification[];
  onChanged?: () => void;
};

export function CalendarInviteGroup({ invites, onChanged }: CalendarInviteGroupProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();

  if (invites.length === 0) {
    return null;
  }

  function handleAccept(token: string) {
    startTransition(async () => {
      const result = await acceptInvite({ token });
      if (!result.success) {
        showToast(result.message, "error");
        return;
      }
      showToast("Calendar invite accepted");
      router.refresh();
      onChanged?.();
    });
  }

  function handleDecline(token: string) {
    startTransition(async () => {
      const result = await declineInvite({ token });
      if (!result.success) {
        showToast(result.message, "error");
        return;
      }
      showToast("Calendar invite declined");
      router.refresh();
      onChanged?.();
    });
  }

  return (
    <section className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-wide text-accent">
        Calendar invites
      </p>
      <ul className="space-y-2">
        {invites.map((invite) => (
          <li
            key={invite.token}
            className="flex items-center justify-between gap-2 rounded-lg bg-surface/40 px-3 py-2 text-sm"
          >
            <span className="text-text-primary">
              {invite.calendarName}{" "}
              <span className="text-text-secondary">({invite.role})</span>
            </span>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleAccept(invite.token)}
                className="text-xs uppercase text-accent hover:underline disabled:opacity-50"
              >
                Accept
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleDecline(invite.token)}
                className="text-xs uppercase text-text-secondary hover:underline disabled:opacity-50"
              >
                Decline
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
    </section>
  );
}
