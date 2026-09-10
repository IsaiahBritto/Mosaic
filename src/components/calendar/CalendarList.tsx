"use client";

import type { Calendar, CalendarGroup } from "@/types/calendar";
import { orderCalendarsForDisplay } from "@/lib/services/calendar.service";
import { CalendarRow } from "@/components/calendar/CalendarRow";
import { CalendarCheckbox } from "@/components/calendar/CalendarCheckbox";
import { cn } from "@/lib/utils/cn";

type CalendarListProps = {
  groups: CalendarGroup[];
  visibleIds: string[];
  onToggle: (calendarId: string, visible: boolean) => void;
  onEdit?: (calendar: Calendar) => void;
  onDelete?: (calendarId: string) => void;
  compact?: boolean;
  showDelete?: boolean;
  hideGroupHeaders?: boolean;
  showSharedBadge?: boolean;
};

function renderCalendarItem(
  calendar: Calendar,
  props: Pick<
    CalendarListProps,
    "visibleIds" | "onToggle" | "onEdit" | "onDelete" | "compact" | "showDelete" | "showSharedBadge"
  >,
) {
  const { visibleIds, onToggle, onEdit, onDelete, compact, showDelete, showSharedBadge } =
    props;

  if (compact) {
    return (
      <CalendarCheckbox
        key={calendar.id}
        calendar={calendar}
        checked={visibleIds.includes(calendar.id)}
        onToggle={(checked) => onToggle(calendar.id, checked)}
        onEdit={onEdit ? () => onEdit(calendar) : undefined}
        showSharedBadge={showSharedBadge}
      />
    );
  }

  return (
    <CalendarRow
      key={calendar.id}
      calendar={calendar}
      checked={visibleIds.includes(calendar.id)}
      onToggle={(checked) => onToggle(calendar.id, checked)}
      onEdit={onEdit ? () => onEdit(calendar) : undefined}
      onDelete={onDelete ? () => onDelete(calendar.id) : undefined}
      showDelete={showDelete}
    />
  );
}

export function CalendarList({
  groups,
  visibleIds,
  onToggle,
  onEdit,
  onDelete,
  compact = false,
  showDelete = false,
  hideGroupHeaders = false,
  showSharedBadge = false,
}: CalendarListProps) {
  const itemProps = {
    visibleIds,
    onToggle,
    onEdit,
    onDelete,
    compact,
    showDelete,
    showSharedBadge,
  };

  if (compact) {
    const ordered = orderCalendarsForDisplay(groups);
    return (
      <div className="flex flex-col gap-1">
        {ordered.map((calendar) => renderCalendarItem(calendar, itemProps))}
      </div>
    );
  }

  const visibleGroups = groups.filter(
    (group) => group.calendars.length > 0 || group.disabled,
  );

  return (
    <div className="flex flex-col gap-2">
      {visibleGroups.map((group) => (
        <section
          key={group.label + (group.disabled ? "-stub" : "")}
          className={cn(group.disabled && "opacity-50")}
        >
          <h3
            className={cn(
              "mb-2 px-1 text-xs font-bold uppercase tracking-widest text-text-secondary",
              hideGroupHeaders && "sr-only",
            )}
          >
            {group.title}
            {group.disabled && group.emptyMessage ? (
              <span className="ml-2 text-[10px] font-normal normal-case text-accent">
                {group.emptyMessage}
              </span>
            ) : null}
          </h3>

          <div className="flex flex-col gap-1">
            {group.calendars.map((calendar) =>
              renderCalendarItem(calendar, itemProps),
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
