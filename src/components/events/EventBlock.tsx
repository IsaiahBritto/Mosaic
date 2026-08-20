"use client";

import Link from "next/link";
import type { EventDisplayData } from "@/lib/calendar/timeline";
import type { EventPosition } from "@/lib/calendar/timeline";
import {
  EventCardContent,
  TravelZone,
} from "@/components/events/EventCardContent";
import { cn } from "@/lib/utils/cn";

type EventBlockProps = {
  event: EventDisplayData;
  position: EventPosition;
  editHref: string;
  isRecurring?: boolean;
};

export function EventBlock({
  event,
  position,
  editHref,
  isRecurring = false,
}: EventBlockProps) {
  const eventBodyTop = position.travelBeforeHeight;
  const eventBodyHeight = Math.max(
    position.height - position.travelBeforeHeight - position.travelAfterHeight,
    0,
  );

  return (
    <Link
      href={editHref}
      className={cn(
        "absolute left-14 right-2 overflow-hidden rounded-lg text-xs shadow-md",
        "transition-opacity hover:opacity-90",
      )}
      style={{
        top: position.top,
        height: position.height,
        backgroundColor: event.calendarColor,
      }}
    >
      {position.travelBeforeHeight > 0 ? (
        <TravelZone
          calendarColor={event.calendarColor}
          className="absolute inset-x-0 top-0"
          style={{ height: position.travelBeforeHeight }}
        />
      ) : null}

      <div
        className="absolute inset-x-0 overflow-hidden px-2 py-1"
        style={{ top: eventBodyTop, height: eventBodyHeight }}
      >
        <EventCardContent
          title={event.title}
          location={event.location}
          startTime={position.startLabel}
          endTime={position.endLabel}
          isRecurring={isRecurring}
          textOnColor
        />
      </div>

      {position.travelAfterHeight > 0 ? (
        <TravelZone
          calendarColor={event.calendarColor}
          label="Travel after"
          className="absolute inset-x-0 bottom-0"
          style={{ height: position.travelAfterHeight }}
        />
      ) : null}
    </Link>
  );
}
