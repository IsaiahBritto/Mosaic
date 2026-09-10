"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { formatCalendarDate } from "@/lib/calendar/timezone";
import {
  TIMELINE_DAY_START_HOUR,
  TIMELINE_HEIGHT_PX,
  PX_PER_HOUR,
} from "@/lib/calendar/constants";
import {
  getShellScrollContainer,
  getTimelineHours,
  getTimelineScrollTargetMinutes,
  hourIndexToPx,
  pxToSnappedMinutes,
  scrollTimelineToMinutes,
  toEventDisplayData,
} from "@/lib/calendar/timeline";
import { getEventSegmentForDay } from "@/lib/calendar/event-segments";
import { buildReturnTo } from "@/lib/navigation/return-to";
import type { EventInstance } from "@/types/event";
import { DraggableEventBlock } from "@/components/events/DraggableEventBlock";
import { EventCard } from "@/components/events/EventCard";
import { TimeRail } from "@/components/calendar/TimeRail";

const SCROLL_PADDING_PX = 8;
const WHEEL_DAMPENING = 0.4;

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
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const timelineRef = useRef<HTMLDivElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(
    null,
  );
  const dateParam = formatCalendarDate(date, displayTimezone);
  const hours = getTimelineHours();

  useEffect(() => {
    setSelectedInstanceId(null);

    const timeline = timelineRef.current;
    const scrollContainer = getShellScrollContainer(timeline);
    if (!timeline || !scrollContainer) {
      return;
    }

    const scrollEl: HTMLElement = scrollContainer;
    const timelineEl: HTMLDivElement = timeline;

    const targetMinutes = getTimelineScrollTargetMinutes(
      events,
      displayTimezone,
      dateParam,
    );

    const frameId = requestAnimationFrame(() => {
      scrollTimelineToMinutes(
        scrollEl,
        timelineEl,
        targetMinutes,
        SCROLL_PADDING_PX,
      );
    });

    function handleWheel(event: WheelEvent) {
      event.preventDefault();
      scrollEl.scrollTop += event.deltaY * WHEEL_DAMPENING;
    }

    scrollEl.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      cancelAnimationFrame(frameId);
      scrollEl.removeEventListener("wheel", handleWheel);
    };
  }, [dateParam, displayTimezone, events]);

  function handleEmptyClick(event: React.MouseEvent<HTMLDivElement>) {
    if (dragActive) {
      return;
    }

    if (selectedInstanceId !== null) {
      setSelectedInstanceId(null);
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const y = event.clientY - rect.top;
    const snapped = pxToSnappedMinutes(y);
    const totalMinutes = TIMELINE_DAY_START_HOUR * 60 + snapped;
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    const startTime = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    const returnTo = buildReturnTo(pathname, searchParams.toString());
    router.push(
      `/events/new?date=${dateParam}&startTime=${startTime}&returnTo=${returnTo}`,
    );
  }

  const timedEvents = events.filter((event) => {
    if (event.isAllDay) {
      return false;
    }
    return getEventSegmentForDay(event, dateParam, displayTimezone) !== null;
  });
  const writableSet = new Set(writableCalendarIds);

  return (
    <div className="px-2 pb-6">
      {events.some((event) => event.isAllDay) ? (
        <div className="sticky top-0 z-10 mb-3 space-y-2 bg-background px-1 pb-2">
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
              className={
                selectedInstanceId === event.instanceId ? "relative z-10" : ""
              }
              onClick={(e) => e.stopPropagation()}
              onKeyDown={() => {}}
              role="presentation"
            >
              <DraggableEventBlock
                event={event}
                dateParam={dateParam}
                displayTimezone={displayTimezone}
                editHref={`/events/${event.masterEventId}?date=${dateParam}`}
                canEdit={writableSet.has(event.calendarId)}
                isSelected={selectedInstanceId === event.instanceId}
                timelineRef={timelineRef}
                onSelect={() => setSelectedInstanceId(event.instanceId)}
                onDeselect={() => setSelectedInstanceId(null)}
                onDragActiveChange={setDragActive}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
