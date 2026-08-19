import { isSameDay } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import {
  getMonthGridDates,
  isDateInMonth,
  type DayAvailability,
} from "@/lib/calendar/availability";
import { DAY_LABELS } from "@/lib/calendar/date-params";
import { MonthCell } from "@/components/calendar/MonthCell";
import { cn } from "@/lib/utils/cn";

type MonthGridProps = {
  monthDate: Date;
  selectedDate: Date;
  availabilityMap: Map<string, DayAvailability>;
  timezone: string;
};

export function MonthGrid({
  monthDate,
  selectedDate,
  availabilityMap,
  timezone,
}: MonthGridProps) {
  const dates = getMonthGridDates(monthDate);
  const today = new Date();

  return (
    <div className="px-2">
      <div className="mb-2 grid grid-cols-7 gap-1 text-center">
        {DAY_LABELS.map((label, index) => (
          <span
            key={`${label}-${index}`}
            className={cn(
              "text-[10px] uppercase text-text-secondary",
              selectedDate.getDay() === index && "font-bold text-accent",
            )}
          >
            {label}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {dates.map((date) => {
          const key = formatInTimeZone(date, timezone, "yyyy-MM-dd");
          return (
            <MonthCell
              key={key}
              date={date}
              isCurrentMonth={isDateInMonth(date, monthDate)}
              isToday={isSameDay(date, today)}
              isSelected={isSameDay(date, selectedDate)}
              availability={availabilityMap.get(key)}
            />
          );
        })}
      </div>
    </div>
  );
}
