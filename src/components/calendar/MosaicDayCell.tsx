import { parseISO } from "date-fns";
import type { MosaicDay } from "@/lib/calendar/mosaic";

type MosaicDayCellProps = {
  day: MosaicDay;
};

export function MosaicDayCell({ day }: MosaicDayCellProps) {
  const label = parseISO(`${day.date}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  if (day.colors.length === 0) {
    return (
      <div
        className="aspect-square bg-surface"
        title={label}
        aria-label={label}
      />
    );
  }

  return (
    <div
      className="flex aspect-square flex-col overflow-hidden"
      title={label}
      aria-label={label}
    >
      {day.colors.map((color) => (
        <div
          key={`${day.date}-${color}`}
          className="min-h-0 flex-1"
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  );
}
