"use client";

import { ControlBar } from "@/components/shell/ControlBar";
import { cn } from "@/lib/utils/cn";

type CollapsibleControlBarProps = {
  selectedDate: Date;
  collapsed: boolean;
  variant?: "full" | "minimal";
};

export function CollapsibleControlBar({
  selectedDate,
  collapsed,
  variant = "full",
}: CollapsibleControlBarProps) {
  return (
    <div
      className={cn(
        "overflow-hidden transition-all duration-300 ease-out",
        collapsed ? "max-h-0 opacity-0" : "max-h-20 opacity-100",
      )}
    >
      <ControlBar selectedDate={selectedDate} variant={variant} />
    </div>
  );
}
