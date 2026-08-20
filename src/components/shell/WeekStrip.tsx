"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatInTimeZone } from "date-fns-tz";
import { getWeekAvailability } from "@/lib/actions/views";
import {
  neutralCellClass,
  type DayAvailability,
  type DayStatus,
} from "@/lib/calendar/availability";
import { useAvailabilityDisplayMode } from "@/components/calendar/AvailabilityDisplayContext";
import { DAY_LABELS } from "@/lib/calendar/date-params";
import {
  formatCalendarDate,
  getWeekCalendarDateParams,
  parseCalendarDateParam,
} from "@/lib/calendar/timezone";
import { cn } from "@/lib/utils/cn";

const DOT_COLORS: Record<DayStatus, string> = {
  free: "bg-status-free",
  busy: "bg-status-busy",
  partial: "bg-status-busy",
  holiday: "bg-status-holiday",
};

type WeekStripProps = {
  dateParam: string;
  selectedDate: Date;
  displayTimezone: string;
};

export function WeekStrip({
  dateParam,
  selectedDate,
  displayTimezone,
}: WeekStripProps) {
  const mode = useAvailabilityDisplayMode();
  const isSpecific = mode === "specific";
  const weekDateParams = getWeekCalendarDateParams(dateParam, displayTimezone);
  const [availability, setAvailability] = useState<Record<string, DayAvailability>>({});

  useEffect(() => {
    getWeekAvailability(dateParam).then(setAvailability);
  }, [dateParam]);

  return (
    <div className="grid grid-cols-7 gap-1 px-3 pb-2 text-center">
      {weekDateParams.map((weekDateParam, index) => {
        const date = parseCalendarDateParam(weekDateParam, displayTimezone);
        const isSelected = formatCalendarDate(selectedDate, displayTimezone) === weekDateParam;
        const isToday =
          formatCalendarDate(new Date(), displayTimezone) === weekDateParam;
        const dayAvailability = availability[weekDateParam];

        const showPartialSplit =
          !isSpecific &&
          dayAvailability?.status === "partial" &&
          (dayAvailability.busyRatio ?? 0) > 0;

        return (
          <Link
            key={weekDateParam}
            href={`/week?date=${weekDateParam}`}
            className="flex flex-col items-center gap-1"
          >
            <span className="text-[10px] uppercase text-text-secondary">
              {DAY_LABELS[index]}
            </span>
            <span
              className={cn(
                "relative flex w-full min-h-[3.5rem] flex-col overflow-hidden rounded-md p-1",
                isSpecific
                  ? neutralCellClass()
                  : dayAvailability?.status === "free" && "bg-status-free/10",
                !isSpecific && dayAvailability?.status === "busy" && "bg-status-busy/10",
                showPartialSplit && "bg-surface/40",
                !isSpecific &&
                  dayAvailability?.status === "holiday" &&
                  "bg-status-holiday/10",
                isSelected && isToday && "ring-2 ring-accent",
                isSelected && !isToday && "ring-2 ring-white",
              )}
            >
              {showPartialSplit ? (
                <span className="absolute inset-0 flex flex-col">
                  <span
                    className="bg-status-busy/30"
                    style={{ flex: Math.max(dayAvailability!.busyRatio, 0.05) }}
                  />
                  <span className="h-px shrink-0 bg-background/80" />
                  <span
                    className="bg-status-free/20"
                    style={{ flex: Math.max(1 - dayAvailability!.busyRatio, 0.05) }}
                  />
                </span>
              ) : null}
              <span
                className={cn(
                  "relative z-10 flex flex-1 items-center justify-center",
                  isToday && "text-2xl font-extrabold text-accent",
                  !isToday && isSelected && "text-sm text-text-primary",
                  !isToday && !isSelected && "text-sm text-text-secondary",
                )}
              >
                {formatInTimeZone(date, displayTimezone, "d")}
              </span>
              <div className="relative z-10 mt-auto flex h-1.5 justify-center gap-0.5">
                {isSpecific
                  ? (dayAvailability?.calendarDots ?? []).slice(0, 5).map((dot) => (
                      <span
                        key={`${weekDateParam}-${dot.calendarId}`}
                        className="h-1 w-1 rounded-full"
                        style={{ backgroundColor: dot.colorHex }}
                      />
                    ))
                  : (dayAvailability?.dots ?? []).slice(0, 3).map((dot, dotIndex) => (
                      <span
                        key={`${weekDateParam}-${dotIndex}`}
                        className={cn("h-1 w-1 rounded-full", DOT_COLORS[dot])}
                      />
                    ))}
              </div>
            </span>
          </Link>
        );
      })}
    </div>
  );
}
