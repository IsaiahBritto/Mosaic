import { formatInTimeZone } from "date-fns-tz";
import { parseCalendarDateParam } from "@/lib/calendar/timezone";

type MonthHeaderProps = {
  monthDateParam: string;
  timezone: string;
};

export function MonthHeader({ monthDateParam, timezone }: MonthHeaderProps) {
  const label = formatInTimeZone(
    parseCalendarDateParam(monthDateParam, timezone),
    timezone,
    "MMMM yyyy",
  ).toUpperCase();

  return (
    <h2 className="px-4 py-3 text-center text-sm font-bold tracking-widest text-text-primary">
      {label}
    </h2>
  );
}
