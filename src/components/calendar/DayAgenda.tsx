import Link from "next/link";
import { formatDateParam } from "@/lib/calendar/date-params";
import { toEventDisplayData } from "@/lib/calendar/timeline";
import type { EventInstance } from "@/types/event";
import { EventCard } from "@/components/events/EventCard";
import { TravelTimeBlock } from "@/components/events/TravelTimeBlock";
import { Button } from "@/components/ui/Button";

type DayAgendaProps = {
  date: Date;
  events: EventInstance[];
  timezone: string;
};

export function DayAgenda({ date, events, timezone }: DayAgendaProps) {
  const dateParam = formatDateParam(date);
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
        const display = toEventDisplayData(event);
        return (
          <div key={event.instanceId} className="flex flex-col gap-2">
            <TravelTimeBlock minutes={event.travelBeforeMinutes} />
            <EventCard
              event={display}
              timezone={timezone}
              editHref={`/events/${event.masterEventId}?date=${dateParam}`}
            />
            <TravelTimeBlock minutes={event.travelAfterMinutes} label="Travel After" />
          </div>
        );
      })}
    </div>
  );
}
