"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { isSameDay } from "date-fns";
import { getWeekAvailability } from "@/lib/actions/views";
import type { DayAvailability } from "@/lib/calendar/availability";
import {
  DAY_LABELS,
  formatDateParam,
  getWeekDates,
} from "@/lib/calendar/date-params";
import { cn } from "@/lib/utils/cn";

const DOT_COLORS = {
  free: "bg-status-free",
  busy: "bg-status-busy",
  partial: "bg-status-busy",
  holiday: "bg-status-holiday",
} as const;

type WeekStripProps = {
  selectedDate: Date;
};

export function WeekStrip({ selectedDate }: WeekStripProps) {
  const weekDates = getWeekDates(selectedDate);
  const [availability, setAvailability] = useState<Record<string, DayAvailability>>({});

  useEffect(() => {
    getWeekAvailability(formatDateParam(selectedDate)).then(setAvailability);
  }, [selectedDate]);

  return (
    <div className="grid grid-cols-7 gap-1 px-3 pb-2 text-center">
      {weekDates.map((date, index) => {
        const isSelected = isSameDay(date, selectedDate);
        const isToday = isSameDay(date, new Date());
        const dateParam = formatDateParam(date);
        const dayAvailability = availability[dateParam];

        return (
          <Link
            key={dateParam}
            href={`/day?date=${dateParam}`}
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
            <span
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full text-sm",
                isSelected && "font-bold text-text-primary",
                !isSelected && isToday && "text-accent",
                !isSelected && !isToday && "text-text-secondary",
              )}
            >
              {date.getDate()}
            </span>
            <div className="flex h-1.5 justify-center gap-0.5">
              {(dayAvailability?.dots ?? []).slice(0, 3).map((dot, dotIndex) => (
                <span
                  key={`${dateParam}-${dotIndex}`}
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
