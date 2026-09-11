import Link from "next/link";
import { formatInTimeZone } from "date-fns-tz";
import {
  getMiniMonthCells,
  statusCellClass,
  type DayAvailability,
} from "@/lib/calendar/availability";
import { parseCalendarDateParam } from "@/lib/calendar/timezone";
import { cn } from "@/lib/utils/cn";

type MiniMonthProps = {
  monthDateParam: string;
  todayDateParam: string;
  availabilityMap: Map<string, DayAvailability>;
  timezone: string;
};

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"] as const;

export function MiniMonth({
  monthDateParam,
  todayDateParam,
  availabilityMap,
  timezone,
}: MiniMonthProps) {
  const cells = getMiniMonthCells(monthDateParam, timezone);
  const monthPrefix = monthDateParam.slice(0, 7);
  const monthName = formatInTimeZone(
    parseCalendarDateParam(monthDateParam, timezone),
    timezone,
    "MMMM",
  ).toUpperCase();
  const isCurrentMonth = monthPrefix === todayDateParam.slice(0, 7);

  return (
    <Link
      href={`/month?date=${monthDateParam}&select=none`}
      className="block rounded-lg bg-surface/40 p-2 transition-opacity hover:opacity-90"
    >
      <h3
        className={cn(
          "mb-2 text-center tracking-widest",
          isCurrentMonth
            ? "text-sm font-extrabold text-text-primary"
            : "text-[10px] font-bold text-text-secondary",
        )}
      >
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
        {cells.map((cell, index) => {
          if (cell.type === "empty") {
            return (
              <span
                key={`empty-${monthPrefix}-${index}`}
                className="h-4"
                aria-hidden
              />
            );
          }

          const availability = availabilityMap.get(cell.dateParam);
          const status = availability?.status ?? "free";
          const isToday = cell.dateParam === todayDateParam;

          return (
            <span
              key={cell.dateParam}
              className={cn(
                "flex h-4 items-center justify-center rounded-sm text-[9px]",
                statusCellClass(status),
                isToday && "ring-1 ring-accent text-accent",
              )}
            >
              {Number(cell.dateParam.slice(8))}
            </span>
          );
        })}
      </div>
    </Link>
  );
}
