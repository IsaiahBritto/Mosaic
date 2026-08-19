import Link from "next/link";
import { formatInTimeZone } from "date-fns-tz";
import {
  getMonthGridDates,
  isDateInMonth,
  type DayAvailability,
} from "@/lib/calendar/availability";
import { statusCellClass } from "@/components/calendar/MonthCell";
import { parseCalendarDateParam } from "@/lib/calendar/timezone";
import { cn } from "@/lib/utils/cn";

type MiniMonthProps = {
  monthDateParam: string;
  selectedDateParam: string;
  availabilityMap: Map<string, DayAvailability>;
  timezone: string;
};

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"] as const;

export function MiniMonth({
  monthDateParam,
  selectedDateParam,
  availabilityMap,
  timezone,
}: MiniMonthProps) {
  const dates = getMonthGridDates(monthDateParam, timezone);
  const monthName = formatInTimeZone(
    parseCalendarDateParam(monthDateParam, timezone),
    timezone,
    "MMMM",
  ).toUpperCase();

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
        {dates.map((dateParam) => {
          const availability = availabilityMap.get(dateParam);
          const status = availability?.status ?? "free";
          const isSelected = dateParam === selectedDateParam;

          return (
            <Link
              key={dateParam}
              href={`/month?date=${dateParam}`}
              className={cn(
                "flex h-4 items-center justify-center rounded-sm text-[9px]",
                statusCellClass(status),
                !isDateInMonth(dateParam, monthDateParam) && "opacity-30",
                isSelected && "ring-1 ring-text-primary",
              )}
            >
              {Number(dateParam.slice(8))}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
