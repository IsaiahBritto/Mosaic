"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import {
  formatCalendarDate,
  getTodayCalendarDate,
} from "@/lib/calendar/timezone";
import {
  TIMELINE_DAY_START_HOUR,
  TIMELINE_EDGE_PADDING_PX,
  TIMELINE_HEIGHT_PX,
  PX_PER_HOUR,
} from "@/lib/calendar/constants";
import {
  getTimelineHours,
  hourIndexToPx,
  pxToSnappedMinutes,
  toEventDisplayData,
} from "@/lib/calendar/timeline";
import type { EventInstance } from "@/types/event";
import { DraggableEventBlock } from "@/components/events/DraggableEventBlock";
import { EventCard } from "@/components/events/EventCard";
import { TimeRail } from "@/components/calendar/TimeRail";

const DEFAULT_SCROLL_HOUR = 6;

type DayTimelineProps = {
  date: Date;
  events: EventInstance[];
  displayTimezone: string;
  writableCalendarIds: string[];
};

export function DayTimeline({
  date,
  events,
  displayTimezone,
  writableCalendarIds,
}: DayTimelineProps) {
  const router = useRouter();
  const timelineRef = useRef<HTMLDivElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const dateParam = formatCalendarDate(date, displayTimezone);
  const hours = getTimelineHours();

  useEffect(() => {
    const main = timelineRef.current?.closest("main");
    if (!main) {
      return;
    }

    const isToday = dateParam === getTodayCalendarDate(displayTimezone);
    const scrollTargetHour = isToday
      ? Number(formatInTimeZone(new Date(), displayTimezone, "H"))
      : DEFAULT_SCROLL_HOUR;

    main.scrollTop = Math.max(
      0,
      TIMELINE_EDGE_PADDING_PX +
        (scrollTargetHour - TIMELINE_DAY_START_HOUR) * PX_PER_HOUR -
        PX_PER_HOUR,
    );
  }, [dateParam, displayTimezone]);

  function handleEmptyClick(event: React.MouseEvent<HTMLDivElement>) {
    if (dragActive) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const y = event.clientY - rect.top;
    const snapped = pxToSnappedMinutes(y);
    const totalMinutes = TIMELINE_DAY_START_HOUR * 60 + snapped;
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    const startTime = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    router.push(`/events/new?date=${dateParam}&startTime=${startTime}`);
  }

  const timedEvents = events.filter((event) => !event.isAllDay);
  const writableSet = new Set(writableCalendarIds);

  return (
    <div className="px-2 pb-6">
      {events.some((event) => event.isAllDay) ? (
        <div className="mb-3 space-y-2 px-1">
          {events
            .filter((event) => event.isAllDay)
            .map((event) => (
              <EventCard
                key={event.instanceId}
                event={toEventDisplayData(event)}
                timezone={displayTimezone}
                editHref={`/events/${event.masterEventId}?date=${dateParam}`}
              />
            ))}
        </div>
      ) : null}

      <div className="relative flex">
        <TimeRail />
        <div
          ref={timelineRef}
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
                style={{ top: hourIndexToPx(index) }}
              />
              <div
                className="absolute inset-x-0 border-t border-dashed border-surface/50"
                style={{ top: hourIndexToPx(index) + PX_PER_HOUR / 2 }}
              />
            </div>
          ))}

          <div
            className="absolute inset-x-0 border-t border-surface"
            style={{ top: hourIndexToPx(hours.length) }}
          />

          {timedEvents.map((event) => (
            <div
              key={event.instanceId}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={() => {}}
              role="presentation"
            >
              <DraggableEventBlock
                event={event}
                displayTimezone={displayTimezone}
                editHref={`/events/${event.masterEventId}?date=${dateParam}`}
                canEdit={writableSet.has(event.calendarId)}
                timelineRef={timelineRef}
                onDragActiveChange={setDragActive}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
