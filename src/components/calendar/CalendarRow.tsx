"use client";

import type { Calendar } from "@/types/calendar";
import { Checkbox } from "@/components/ui/Checkbox";
import { ColorBar } from "@/components/ui/ColorBar";
import { THEME } from "@/lib/theme/colors";
import { cn } from "@/lib/utils/cn";

type CalendarRowProps = {
  calendar: Calendar;
  checked: boolean;
  onToggle: (checked: boolean) => void;
  onDelete?: () => void;
  showDelete?: boolean;
  compact?: boolean;
};

export function CalendarRow({
  calendar,
  checked,
  onToggle,
  onDelete,
  showDelete = false,
  compact = false,
}: CalendarRowProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 bg-surface/60 px-3 py-3",
        compact ? "py-2" : "py-3",
      )}
    >
      <Checkbox
        checked={checked}
        onChange={onToggle}
        color={checked ? THEME.accent : undefined}
      />
      <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
        <span className="truncate text-sm uppercase tracking-wide text-text-primary">
          {calendar.name}
        </span>
        <div className="flex items-center gap-2">
          {!compact ? (
            <span className="text-xs text-text-secondary">{calendar.colorHex}</span>
          ) : null}
          <ColorBar color={calendar.colorHex} className="h-8 w-1.5 rounded-sm" />
        </div>
      </div>
      {showDelete && calendar.role === "owner" ? (
        <button
          type="button"
          onClick={onDelete}
          className="text-xs text-status-busy hover:underline"
          aria-label={`Delete ${calendar.name}`}
        >
          Delete
        </button>
      ) : null}
    </div>
  );
}
