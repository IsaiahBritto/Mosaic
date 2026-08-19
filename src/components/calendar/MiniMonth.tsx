import Link from "next/link";
import {
  getMonthGridDates,
  isDateInMonth,
  type DayAvailability,
} from "@/lib/calendar/availability";
import { formatDateParam } from "@/lib/calendar/date-params";
import { statusCellClass } from "@/components/calendar/MonthCell";
import { cn } from "@/lib/utils/cn";

type MiniMonthProps = {
  monthDate: Date;
  selectedDate: Date;
  availabilityMap: Map<string, DayAvailability>;
};

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"] as const;

export function MiniMonth({
  monthDate,
  selectedDate,
  availabilityMap,
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
          const key = formatDateParam(date);
          const availability = availabilityMap.get(key);
          const status = availability?.status ?? "free";
          const isSelected =
            date.getFullYear() === selectedDate.getFullYear() &&
            date.getMonth() === selectedDate.getMonth() &&
            date.getDate() === selectedDate.getDate();

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
              {date.getDate()}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
