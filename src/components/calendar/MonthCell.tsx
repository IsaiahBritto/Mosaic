"use client";

import Link from "next/link";
import type { DayAvailability, DayStatus } from "@/lib/calendar/availability";
import { neutralCellClass, statusCellClass } from "@/lib/calendar/availability";
import { useAvailabilityDisplayMode } from "@/components/calendar/AvailabilityDisplayContext";
import { withCalendarDateParam } from "@/lib/calendar/timezone";
import { cn } from "@/lib/utils/cn";

const DOT_COLORS: Record<DayStatus, string> = {
  free: "bg-status-free",
  busy: "bg-status-busy",
  partial: "bg-gradient-to-r from-status-busy to-status-free",
  holiday: "bg-status-holiday",
};

type MonthCellProps = {
  dateParam: string;
  isCurrentMonth?: boolean;
  isToday?: boolean;
  isSelected?: boolean;
  availability?: DayAvailability;
  compact?: boolean;
  href?: string;
};

export function MonthCell({
  dateParam,
  isCurrentMonth = true,
  isToday = false,
  isSelected = false,
  availability,
  compact = false,
  href,
}: MonthCellProps) {
  const mode = useAvailabilityDisplayMode();
  const isSpecific = mode === "specific";
  const status = availability?.status ?? "free";
  const linkHref = href ?? withCalendarDateParam("/day", dateParam);

  return (
    <Link
      href={linkHref}
      className={cn(
        "flex flex-col rounded-md transition-opacity hover:opacity-90",
        isSpecific ? neutralCellClass() : statusCellClass(status),
        compact ? "min-h-[2rem] p-0.5" : "min-h-[3.5rem] p-1",
        !isCurrentMonth && "opacity-40",
        isSelected && isToday && "ring-2 ring-accent",
        isSelected && !isToday && "ring-2 ring-white",
      )}
    >
      <span
        className={cn(
          "text-center",
          compact ? "text-[10px]" : isToday ? "text-2xl font-extrabold" : "text-sm",
          isToday && "text-accent",
          !isToday && !isSpecific && status === "holiday" && "text-status-holiday",
          !isToday && (isSpecific || status !== "holiday") && "text-text-primary",
        )}
      >
        {Number(dateParam.slice(8))}
      </span>

      {!compact && isSpecific && (availability?.calendarDots?.length ?? 0) > 0 ? (
        <div className="mt-auto flex justify-center gap-0.5 pt-1">
          {availability!.calendarDots.slice(0, 5).map((dot) => (
            <span
              key={`${dateParam}-${dot.calendarId}`}
              className="h-1 w-1 rounded-full"
              style={{ backgroundColor: dot.colorHex }}
            />
          ))}
        </div>
      ) : null}

      {!compact && !isSpecific && availability?.dots?.length ? (
        <div className="mt-auto flex justify-center gap-0.5 pt-1">
          {availability.dots.map((dot, index) => (
            <span
              key={`${dateParam}-dot-${index}`}
              className={cn("h-1 w-1 rounded-full", DOT_COLORS[dot])}
            />
          ))}
        </div>
      ) : null}
    </Link>
  );
}
