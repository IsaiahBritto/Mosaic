"use client";

import { useRouter } from "next/navigation";
import { formatDateParam } from "@/lib/calendar/date-params";
import { TIMELINE_HEIGHT_PX, PX_PER_HOUR } from "@/lib/calendar/constants";
import {
  eventToPosition,
  toEventDisplayData,
} from "@/lib/calendar/timeline";
import type { EventInstance } from "@/types/event";
import { EventBlock } from "@/components/events/EventBlock";
import { EventCard } from "@/components/events/EventCard";
import { TimeRail } from "@/components/calendar/TimeRail";
import { getTimelineHours } from "@/lib/calendar/timeline";

type DayTimelineProps = {
  date: Date;
  events: EventInstance[];
  timezone: string;
};

export function DayTimeline({ date, events, timezone }: DayTimelineProps) {
  const router = useRouter();
  const dateParam = formatDateParam(date);
  const hours = getTimelineHours();

  function handleEmptyClick(event: React.MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const y = event.clientY - rect.top;
    const totalMinutes = (y / PX_PER_HOUR) * 60 + hours[0]! * 60;
    const rounded = Math.round(totalMinutes / 30) * 30;
    const h = Math.floor(rounded / 60);
    const m = rounded % 60;
    const startTime = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    router.push(`/events/new?date=${dateParam}&startTime=${startTime}`);
  }

  const timedEvents = events.filter((event) => !event.isAllDay);

  return (
    <div className="flex-1 overflow-y-auto px-2 pb-6">
      {events.some((event) => event.isAllDay) ? (
        <div className="mb-3 space-y-2 px-1">
          {events
            .filter((event) => event.isAllDay)
            .map((event) => (
              <EventCard
                key={event.instanceId}
                event={toEventDisplayData(event)}
                timezone={timezone}
                editHref={`/events/${event.masterEventId}?date=${dateParam}`}
              />
            ))}
        </div>
      ) : null}

      <div className="relative flex">
        <TimeRail />
        <div
          className="relative flex-1 cursor-pointer"
          style={{ height: TIMELINE_HEIGHT_PX }}
          onClick={handleEmptyClick}
          onKeyDown={() => {}}
          role="presentation"
        >
          {hours.map((hour, index) => (
            <div key={hour}>
              <div
                className="absolute inset-x-0 border-t border-surface"
                style={{ top: index * PX_PER_HOUR }}
              />
              <div
                className="absolute inset-x-0 border-t border-dashed border-surface/50"
                style={{ top: index * PX_PER_HOUR + PX_PER_HOUR / 2 }}
              />
            </div>
          ))}

          {timedEvents.map((event) => (
            <div
              key={event.instanceId}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={() => {}}
              role="presentation"
            >
              <EventBlock
                event={toEventDisplayData(event)}
                position={eventToPosition(event, timezone)}
                editHref={`/events/${event.masterEventId}?date=${dateParam}`}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
