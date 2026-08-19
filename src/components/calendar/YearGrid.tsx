import type { DayAvailability } from "@/lib/calendar/availability";
import { MiniMonth } from "@/components/calendar/MiniMonth";

type YearGridProps = {
  year: number;
  selectedDate: Date;
  availabilityMap: Map<string, DayAvailability>;
};

export function YearGrid({ year, selectedDate, availabilityMap }: YearGridProps) {
  const months = Array.from({ length: 12 }, (_, index) => new Date(year, index, 1));

  return (
    <div className="grid grid-cols-2 gap-3 px-3 pb-6">
      {months.map((monthDate) => (
        <MiniMonth
          key={monthDate.getMonth()}
          monthDate={monthDate}
          selectedDate={selectedDate}
          availabilityMap={availabilityMap}
        />
      ))}
    </div>
  );
}
