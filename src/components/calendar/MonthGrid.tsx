import {
  getMonthGridDates,
  isDateInMonth,
  type DayAvailability,
} from "@/lib/calendar/availability";
import { DAY_LABELS } from "@/lib/calendar/date-params";
import { getTodayCalendarDate } from "@/lib/calendar/timezone";
import { MonthCell } from "@/components/calendar/MonthCell";

type MonthGridProps = {
  monthDateParam: string;
  selectedDateParam: string;
  availabilityMap: Map<string, DayAvailability>;
  timezone: string;
};

export function MonthGrid({
  monthDateParam,
  selectedDateParam,
  availabilityMap,
  timezone,
}: MonthGridProps) {
  const dates = getMonthGridDates(monthDateParam, timezone);
  const todayParam = getTodayCalendarDate(timezone);

  return (
    <div className="px-2">
      <div className="mb-2 grid grid-cols-7 gap-1 text-center">
        {DAY_LABELS.map((label, index) => (
          <span
            key={`${label}-${index}`}
            className="text-[10px] uppercase text-text-secondary"
          >
            {label}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {dates.map((dateParam) => (
          <MonthCell
            key={dateParam}
            dateParam={dateParam}
            isCurrentMonth={isDateInMonth(dateParam, monthDateParam)}
            isToday={dateParam === todayParam}
            isSelected={dateParam === selectedDateParam}
            availability={availabilityMap.get(dateParam)}
          />
        ))}
      </div>
    </div>
  );
}
