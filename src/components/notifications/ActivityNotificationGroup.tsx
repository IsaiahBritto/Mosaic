"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { dismissNotification } from "@/lib/actions/notifications";
import { useToast } from "@/components/ui/Toast";
import type { ActivityNotification } from "@/lib/services/notifications.service";

type ActivityNotificationGroupProps = {
  notifications: ActivityNotification[];
  onChanged?: () => void;
};

export function ActivityNotificationGroup({
  notifications,
  onChanged,
}: ActivityNotificationGroupProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();

  if (notifications.length === 0) {
    return null;
  }

  function handleDismiss(notificationId: string) {
    startTransition(async () => {
      const result = await dismissNotification({ notificationId });
      if (!result.success) {
        showToast(result.message, "error");
        return;
      }
      router.refresh();
      onChanged?.();
    });
  }

  return (
    <section className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-wide text-accent">Updates</p>
      <ul className="space-y-2">
        {notifications.map((notification) => (
          <li
            key={notification.id}
            className="flex items-start justify-between gap-2 rounded-lg bg-surface/40 px-3 py-2 text-sm"
          >
            <span className="text-text-primary">{notification.message}</span>
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleDismiss(notification.id)}
              className="shrink-0 text-xs uppercase text-text-secondary hover:underline disabled:opacity-50"
            >
              Dismiss
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
