import type { MosaicDay } from "@/lib/calendar/mosaic";
import { MosaicDayCell } from "@/components/calendar/MosaicDayCell";

type MosaicGridProps = {
  days: MosaicDay[];
};

export function MosaicGrid({ days }: MosaicGridProps) {
  return (
    <div className="flex-1 overflow-y-auto px-2 pb-4">
      <div className="grid grid-cols-9 gap-px bg-background">
        {days.map((day) => (
          <MosaicDayCell key={day.date} day={day} />
        ))}
      </div>
    </div>
  );
}
