import Link from "next/link";
import type { EventInstance } from "@/types/event";
import { formatFullDateHeading } from "@/lib/calendar/timezone";
import { EventCard } from "@/components/events/EventCard";
import { Button } from "@/components/ui/Button";
import { buildReturnTo } from "@/lib/navigation/return-to";

type MonthDayEventsPanelProps = {
  dateParam: string;
  timezone: string;
  events: EventInstance[];
};

function isRecurringEvent(event: EventInstance): boolean {
  return Boolean(event.recurrence) || event.instanceId !== event.masterEventId;
}

export function MonthDayEventsPanel({
  dateParam,
  timezone,
  events,
}: MonthDayEventsPanelProps) {
  const sorted = [...events].sort(
    (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
  );
  const returnTo = buildReturnTo("/month", `date=${dateParam}`);

  return (
    <div className="border-b border-surface px-4 py-4">
      <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-text-secondary">
        {formatFullDateHeading(dateParam, timezone)}
      </h3>

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <p className="text-sm text-text-secondary">No events scheduled</p>
          <Link href={`/events/new?date=${dateParam}&returnTo=${returnTo}`}>
            <Button>Add Event</Button>
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {sorted.map((event) => (
            <EventCard
              key={event.instanceId}
              event={{
                id: event.instanceId,
                masterEventId: event.masterEventId,
                title: event.title,
                location: event.location,
                calendarColor: event.calendarColor,
                startAt: event.startAt,
                endAt: event.endAt,
                isAllDay: event.isAllDay,
                travelBeforeMinutes: event.travelBeforeMinutes,
                travelAfterMinutes: event.travelAfterMinutes,
              }}
              timezone={timezone}
              isRecurring={isRecurringEvent(event)}
              editHref={`/events/${event.masterEventId}?date=${dateParam}&returnTo=${returnTo}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
