import type { DayAvailability } from "@/lib/calendar/availability";
import { MiniMonth } from "@/components/calendar/MiniMonth";

type YearGridProps = {
  year: number;
  selectedDateParam: string;
  availabilityMap: Map<string, DayAvailability>;
  timezone: string;
};

export function YearGrid({
  year,
  selectedDateParam,
  availabilityMap,
  timezone,
}: YearGridProps) {
  const months = Array.from(
    { length: 12 },
    (_, index) => `${year}-${String(index + 1).padStart(2, "0")}-01`,
  );

  return (
    <div className="grid grid-cols-2 gap-3 px-3 pb-6">
      {months.map((monthDateParam) => (
        <MiniMonth
          key={monthDateParam}
          monthDateParam={monthDateParam}
          selectedDateParam={selectedDateParam}
          availabilityMap={availabilityMap}
          timezone={timezone}
        />
      ))}
    </div>
  );
}
