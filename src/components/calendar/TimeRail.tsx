import { PX_PER_HOUR, TIMELINE_HEIGHT_PX } from "@/lib/calendar/constants";
import { formatHourLabel, getTimelineHours, hourIndexToPx } from "@/lib/calendar/timeline";

export function TimeRail() {
  const hours = getTimelineHours();

  return (
    <div
      className="relative w-14 shrink-0 text-[10px] text-text-secondary"
      style={{ height: TIMELINE_HEIGHT_PX }}
    >
      {hours.map((hour, index) => (
        <div
          key={hour}
          className="absolute left-0 right-0 border-t border-surface/80"
          style={{ top: hourIndexToPx(index) }}
        >
          <span className="absolute -top-2 left-1 whitespace-nowrap tabular-nums text-text-primary">
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
      <div
        className="absolute left-0 right-0 border-t border-surface/80"
        style={{ top: hourIndexToPx(hours.length) }}
      >
        <span className="absolute -top-2 left-1 whitespace-nowrap tabular-nums text-text-primary">
          {formatHourLabel(0)}
        </span>
      </div>
    </div>
  );
}
