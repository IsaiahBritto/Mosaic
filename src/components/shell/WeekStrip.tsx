"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatInTimeZone } from "date-fns-tz";
import { getWeekAvailability } from "@/lib/actions/views";
import type { DayAvailability } from "@/lib/calendar/availability";
import { DAY_LABELS } from "@/lib/calendar/date-params";
import {
  formatCalendarDate,
  getWeekCalendarDateParams,
  parseCalendarDateParam,
} from "@/lib/calendar/timezone";
import { cn } from "@/lib/utils/cn";

const DOT_COLORS = {
  free: "bg-status-free",
  busy: "bg-status-busy",
  partial: "bg-status-busy",
  holiday: "bg-status-holiday",
} as const;

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

        return (
          <Link
            key={weekDateParam}
            href={`/day?date=${weekDateParam}`}
            className={cn(
              "flex flex-col items-center gap-1 rounded-md py-1",
              dayAvailability?.status === "free" && "bg-status-free/10",
              dayAvailability?.status === "busy" && "bg-status-busy/10",
              dayAvailability?.status === "partial" &&
                "bg-gradient-to-b from-status-busy/15 to-status-free/10",
              dayAvailability?.status === "holiday" && "bg-status-holiday/10",
            )}
          >
            <span className="text-[10px] uppercase text-text-secondary">
              {DAY_LABELS[index]}
            </span>
            <span className="flex h-10 w-full items-center justify-center">
              <span
                className={cn(
                  (isSelected || isToday) && "text-2xl font-extrabold",
                  !isSelected && !isToday && "text-sm",
                  isToday && "text-accent",
                  !isToday && isSelected && "text-text-primary",
                  !isToday && !isSelected && "text-text-secondary",
                )}
              >
                {formatInTimeZone(date, displayTimezone, "d")}
              </span>
            </span>
            <div className="flex h-1.5 justify-center gap-0.5">
              {(dayAvailability?.dots ?? []).slice(0, 3).map((dot, dotIndex) => (
                <span
                  key={`${weekDateParam}-${dotIndex}`}
                  className={cn("h-1 w-1 rounded-full", DOT_COLORS[dot])}
                />
              ))}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
