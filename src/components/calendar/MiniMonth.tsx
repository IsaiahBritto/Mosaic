import Link from "next/link";
import { formatInTimeZone } from "date-fns-tz";
import {
  getMonthGridDates,
  isDateInMonth,
  type DayAvailability,
} from "@/lib/calendar/availability";
import { statusCellClass } from "@/components/calendar/MonthCell";
import { formatCalendarDate } from "@/lib/calendar/timezone";
import { cn } from "@/lib/utils/cn";

type MiniMonthProps = {
  monthDate: Date;
  selectedDateParam: string;
  availabilityMap: Map<string, DayAvailability>;
  timezone: string;
};

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"] as const;

export function MiniMonth({
  monthDate,
  selectedDateParam,
  availabilityMap,
  timezone,
}: MiniMonthProps) {
  const dates = getMonthGridDates(monthDate);
  const monthName = monthDate
    .toLocaleString("en-US", { month: "long" })
    .toUpperCase();

  return (
    <div className="rounded-lg bg-surface/40 p-2">
      <h3 className="mb-2 text-center text-[10px] font-bold tracking-widest text-text-secondary">
        {monthName}
      </h3>
      <div className="mb-1 grid grid-cols-7 gap-0.5 text-center">
        {DAY_LABELS.map((label, index) => (
          <span key={`${label}-${index}`} className="text-[8px] text-text-secondary/70">
            {label}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {dates.map((date) => {
          const key = formatCalendarDate(date, timezone);
          const availability = availabilityMap.get(key);
          const status = availability?.status ?? "free";
          const isSelected = key === selectedDateParam;

          return (
            <Link
              key={key}
              href={`/month?date=${key}`}
              className={cn(
                "flex h-4 items-center justify-center rounded-sm text-[9px]",
                statusCellClass(status),
                !isDateInMonth(date, monthDate) && "opacity-30",
                isSelected && "ring-1 ring-text-primary",
              )}
            >
              {formatInTimeZone(date, timezone, "d")}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
