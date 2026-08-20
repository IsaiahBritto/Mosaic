import Link from "next/link";
import { formatCalendarDate, formatEventTime } from "@/lib/calendar/timezone";
import { getEventSegmentForDay } from "@/lib/calendar/event-segments";
import type { EventInstance } from "@/types/event";
import { EventCardContent, TravelZone } from "@/components/events/EventCardContent";
import { Button } from "@/components/ui/Button";

type DayAgendaProps = {
  date: Date;
  events: EventInstance[];
  timezone: string;
};

function isRecurringEvent(event: EventInstance): boolean {
  return Boolean(event.recurrence) || event.instanceId !== event.masterEventId;
}

export function DayAgenda({ date, events, timezone }: DayAgendaProps) {
  const dateParam = formatCalendarDate(date, timezone);
  const sorted = [...events].sort(
    (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
  );

  if (sorted.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
        <p className="text-sm text-text-secondary">No events scheduled</p>
        <Link href={`/events/new?date=${dateParam}`}>
          <Button>Add Event</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 px-4 py-4">
      {sorted.map((event) => {
        const segment = getEventSegmentForDay(event, dateParam, timezone);
        if (!segment) {
          return null;
        }
        const startLabel = formatEventTime(
          segment.segmentStartAt,
          timezone,
          segment.isAllDaySegment,
        );
        const endLabel = formatEventTime(
          segment.segmentEndAt,
          timezone,
          segment.isAllDaySegment,
        );

        return (
          <Link
            key={event.instanceId}
            href={`/events/${event.masterEventId}?date=${dateParam}`}
            className="overflow-hidden rounded-lg bg-surface transition-opacity hover:opacity-90"
          >
            {event.travelBeforeMinutes > 0 ? (
              <TravelZone calendarColor={event.calendarColor} />
            ) : null}
            <div
              className="flex"
              style={{ borderLeft: `4px solid ${event.calendarColor}` }}
            >
              <div className="flex min-w-0 flex-1 px-3 py-3">
                <EventCardContent
                  title={event.title}
                  location={event.location}
                  startTime={startLabel}
                  endTime={endLabel}
                  isAllDay={segment.isAllDaySegment}
                  isRecurring={isRecurringEvent(event)}
                />
              </div>
            </div>
            {event.travelAfterMinutes > 0 ? (
              <TravelZone calendarColor={event.calendarColor} label="Travel after" />
            ) : null}
          </Link>
        );
      })}
    </div>
  );
}
