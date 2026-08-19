"use client";

import type { Calendar } from "@/types/calendar";
import { Checkbox } from "@/components/ui/Checkbox";
import { ColorBar } from "@/components/ui/ColorBar";
import { THEME } from "@/lib/theme/colors";

type CalendarCheckboxProps = {
  calendar: Calendar;
  checked: boolean;
  onToggle: (checked: boolean) => void;
};

export function CalendarCheckbox({
  calendar,
  checked,
  onToggle,
}: CalendarCheckboxProps) {
  return (
    <label className="flex items-center gap-3 py-1.5">
      <Checkbox
        checked={checked}
        onChange={onToggle}
        color={checked ? THEME.accent : undefined}
      />
      <span className="flex-1 truncate text-sm text-text-primary">
        {calendar.name}
      </span>
      <ColorBar color={calendar.colorHex} className="h-6 w-1 rounded-sm" />
    </label>
  );
}
