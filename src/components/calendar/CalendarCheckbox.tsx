"use client";

import type { Calendar } from "@/types/calendar";
import { Checkbox } from "@/components/ui/Checkbox";
import { SharedBadge } from "@/components/calendar/SharedBadge";
import { isSharedCalendar } from "@/lib/calendar/shared";

type CalendarCheckboxProps = {
  calendar: Calendar;
  checked: boolean;
  onToggle: (checked: boolean) => void;
  onEdit?: () => void;
  showSharedBadge?: boolean;
  onSharedClick?: (calendar: Calendar) => void;
};

export function CalendarCheckbox({
  calendar,
  checked,
  onToggle,
  onEdit,
  showSharedBadge = false,
  onSharedClick,
}: CalendarCheckboxProps) {
  const isShared = isSharedCalendar(calendar);

  return (
    <div className="flex items-center gap-3 py-1.5">
      <Checkbox
        checked={checked}
        onChange={onToggle}
        color={calendar.colorHex}
      />
      <span className="flex min-w-0 flex-1 items-center gap-2">
        {onEdit ? (
          <button
            type="button"
            onClick={onEdit}
            className="truncate text-left text-sm text-text-primary hover:underline"
          >
            {calendar.name}
          </button>
        ) : (
          <span className="truncate text-sm text-text-primary">{calendar.name}</span>
        )}
        {showSharedBadge && isShared ? (
          <SharedBadge
            onClick={
              onSharedClick ? () => onSharedClick(calendar) : undefined
            }
          />
        ) : null}
      </span>
    </div>
  );
}
