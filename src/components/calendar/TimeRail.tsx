import { PX_PER_HOUR, TIMELINE_HEIGHT_PX } from "@/lib/calendar/constants";
import { formatHourLabel, getTimelineHours } from "@/lib/calendar/timeline";

export function TimeRail() {
  const hours = getTimelineHours();

  return (
    <div
      className="relative w-12 shrink-0 text-[10px] text-text-secondary"
      style={{ height: TIMELINE_HEIGHT_PX }}
    >
      {hours.map((hour, index) => (
        <div
          key={hour}
          className="absolute left-0 right-0 border-t border-surface/80"
          style={{ top: index * PX_PER_HOUR }}
        >
          <span className="absolute -top-2 left-1 text-text-primary">
            {formatHourLabel(hour)}
          </span>
          {index < hours.length - 1 ? (
            <span
              className="absolute left-1 text-[9px] text-text-secondary/70"
              style={{ top: PX_PER_HOUR / 2 - 6 }}
            >
              :30
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}
