"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { BellIcon } from "@/components/notifications/BellIcon";
import { NotificationPanel } from "@/components/notifications/NotificationPanel";
import { cn } from "@/lib/utils/cn";

type NotificationBellProps = {
  count: number;
  className?: string;
};

export function NotificationBell({ count, className }: NotificationBellProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        aria-label={`Notifications${count > 0 ? `, ${count} unread` : ""}`}
        onClick={() => setOpen(true)}
        className={cn("relative h-9 min-w-9 px-2.5", className)}
      >
        <BellIcon className="h-4 w-4" />
        {count > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-background">
            {count > 99 ? "99+" : count}
          </span>
        ) : null}
      </Button>
      <NotificationPanel open={open} onClose={() => setOpen(false)} />
    </>
  );
}
