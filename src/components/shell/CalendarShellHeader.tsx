"use client";

import { MosaicBrand } from "@/components/shell/ViewNav";
import { ProfileButton } from "@/components/shell/profile/ProfileButton";
import { cn } from "@/lib/utils/cn";

type CalendarShellHeaderProps = {
  dateParam: string;
  displayName: string;
  sticky?: boolean;
  children?: React.ReactNode;
  className?: string;
};

export function CalendarShellHeader({
  dateParam,
  displayName,
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
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 py-3">
        <div className="justify-self-start">
          <ProfileButton displayName={displayName} />
        </div>
        <MosaicBrand dateParam={dateParam} embedded />
        <div aria-hidden />
      </div>
      {children}
    </header>
  );
}
