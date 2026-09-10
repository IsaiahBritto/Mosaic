"use client";

import { MosaicBrand } from "@/components/shell/ViewNav";
import { ProfileButton } from "@/components/shell/profile/ProfileButton";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { cn } from "@/lib/utils/cn";

type CalendarShellHeaderProps = {
  dateParam: string;
  displayName: string;
  notificationCount: number;
  sticky?: boolean;
  children?: React.ReactNode;
  className?: string;
};

export function CalendarShellHeader({
  dateParam,
  displayName,
  notificationCount,
  sticky = false,
  children,
  className,
}: CalendarShellHeaderProps) {
  return (
    <header
      className={cn(
        "shrink-0 bg-background",
        sticky && "sticky top-0 z-20",
        className,
      )}
    >
      <div className="relative flex w-full items-center justify-between px-4 py-3">
        <ProfileButton displayName={displayName} className="relative z-10" />
        <div className="pointer-events-none absolute inset-x-0 flex justify-center [&_a]:pointer-events-auto">
          <MosaicBrand dateParam={dateParam} embedded />
        </div>
        <NotificationBell count={notificationCount} className="relative z-10" />
      </div>
      {children}
    </header>
  );
}
