import Link from "next/link";
import { ColorBar } from "@/components/ui/ColorBar";
import type { EventDisplayData } from "@/lib/calendar/timeline";
import { formatEventTime } from "@/lib/calendar/timezone";
import { EventCardContent } from "@/components/events/EventCardContent";

type EventCardProps = {
  event: EventDisplayData;
  timezone: string;
  editHref: string;
  isRecurring?: boolean;
};

export function EventCard({ event, timezone, editHref, isRecurring }: EventCardProps) {
  return (
    <Link
      href={editHref}
      className="flex overflow-hidden rounded-lg bg-surface transition-opacity hover:opacity-90"
    >
      <ColorBar color={event.calendarColor} className="w-1 shrink-0" />
      <div className="flex min-w-0 flex-1 px-3 py-3">
        <EventCardContent
          title={event.title}
          location={event.location}
          startTime={formatEventTime(event.startAt, timezone, event.isAllDay)}
          endTime={formatEventTime(event.endAt, timezone, event.isAllDay)}
          isAllDay={event.isAllDay}
          isRecurring={isRecurring}
        />
      </div>
    </Link>
  );
}
