import Link from "next/link";
import { ColorBar } from "@/components/ui/ColorBar";
import type { EventDisplayData } from "@/lib/calendar/timeline";
import { formatEventTime } from "@/lib/calendar/timezone";

type EventCardProps = {
  event: EventDisplayData;
  timezone: string;
  editHref: string;
};

export function EventCard({ event, timezone, editHref }: EventCardProps) {
  return (
    <Link
      href={editHref}
      className="flex overflow-hidden rounded-lg bg-surface transition-opacity hover:opacity-90"
    >
      <ColorBar color={event.calendarColor} className="w-1 shrink-0" />
      <div className="flex min-w-0 flex-1 items-start justify-between gap-3 px-3 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold uppercase text-text-primary">
            {event.title}
          </p>
          {event.location ? (
            <p className="truncate text-xs italic text-text-secondary">
              {event.location}
            </p>
          ) : null}
        </div>
        <div className="shrink-0 text-right text-xs text-text-secondary">
          <p>{formatEventTime(event.startAt, timezone, event.isAllDay)}</p>
          <p>{formatEventTime(event.endAt, timezone, event.isAllDay)}</p>
        </div>
      </div>
    </Link>
  );
}
