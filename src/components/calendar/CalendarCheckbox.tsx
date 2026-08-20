"use client";

import type { Calendar } from "@/types/calendar";
import { Checkbox } from "@/components/ui/Checkbox";

type CalendarCheckboxProps = {
  calendar: Calendar;
  checked: boolean;
  onToggle: (checked: boolean) => void;
  showSharedBadge?: boolean;
};

export function CalendarCheckbox({
  calendar,
  checked,
  onToggle,
  showSharedBadge = false,
}: CalendarCheckboxProps) {
  const isShared = calendar.type === "shared" || calendar.role !== "owner";

  return (
    <label className="flex items-center gap-3 py-1.5">
      <Checkbox
        checked={checked}
        onChange={onToggle}
        color={calendar.colorHex}
      />
      <span className="flex min-w-0 flex-1 items-center gap-2">
        <span className="truncate text-sm text-text-primary">{calendar.name}</span>
        {showSharedBadge && isShared ? (
          <span className="shrink-0 text-[10px] uppercase tracking-wide text-accent">
            +shared
          </span>
        ) : null}
      </span>
    </label>
  );
}
