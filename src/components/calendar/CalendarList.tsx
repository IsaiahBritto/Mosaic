"use client";

import type { CalendarGroup } from "@/types/calendar";
import { CalendarRow } from "@/components/calendar/CalendarRow";
import { CalendarCheckbox } from "@/components/calendar/CalendarCheckbox";
import { cn } from "@/lib/utils/cn";

type CalendarListProps = {
  groups: CalendarGroup[];
  visibleIds: string[];
  onToggle: (calendarId: string, visible: boolean) => void;
  onDelete?: (calendarId: string) => void;
  compact?: boolean;
  showDelete?: boolean;
  hideGroupHeaders?: boolean;
  showSharedBadge?: boolean;
};

export function CalendarList({
  groups,
  visibleIds,
  onToggle,
  onDelete,
  compact = false,
  showDelete = false,
  hideGroupHeaders = false,
  showSharedBadge = false,
}: CalendarListProps) {
  return (
    <div className="flex flex-col gap-4">
      {groups.map((group) => (
        <section
          key={group.label}
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

          {group.calendars.length === 0 && group.emptyMessage && !group.disabled ? (
            <p className="px-1 py-2 text-sm text-text-secondary">
              {group.emptyMessage}
            </p>
          ) : null}

          <div className="flex flex-col gap-1">
            {group.calendars.map((calendar) =>
              compact ? (
                <CalendarCheckbox
                  key={calendar.id}
                  calendar={calendar}
                  checked={visibleIds.includes(calendar.id)}
                  onToggle={(checked) => onToggle(calendar.id, checked)}
                  showSharedBadge={showSharedBadge}
                />
              ) : (
                <CalendarRow
                  key={calendar.id}
                  calendar={calendar}
                  checked={visibleIds.includes(calendar.id)}
                  onToggle={(checked) => onToggle(calendar.id, checked)}
                  onDelete={onDelete ? () => onDelete(calendar.id) : undefined}
                  showDelete={showDelete}
                />
              ),
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
