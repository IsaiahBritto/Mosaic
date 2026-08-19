import Link from "next/link";
import type { EventDisplayData } from "@/lib/calendar/timeline";
import type { EventPosition } from "@/lib/calendar/timeline";
import { cn } from "@/lib/utils/cn";

type EventBlockProps = {
  event: EventDisplayData;
  position: EventPosition;
  editHref: string;
};

export function EventBlock({ event, position, editHref }: EventBlockProps) {
  return (
    <Link
      href={editHref}
      className={cn(
        "absolute left-14 right-2 overflow-hidden rounded-lg px-2 py-1 text-xs shadow-md",
        "transition-opacity hover:opacity-90",
      )}
      style={{
        top: position.top,
        height: position.height,
        backgroundColor: event.calendarColor,
      }}
    >
      {position.travelBeforeHeight > 0 ? (
        <div
          className="absolute inset-x-0 top-0 bg-travel-time/40"
          style={{ height: position.travelBeforeHeight }}
        />
      ) : null}
      <div className="relative flex h-full flex-col justify-between text-background">
        <div className="flex items-start justify-between gap-2">
          <span className="truncate font-semibold uppercase">{event.title}</span>
          <span className="shrink-0 opacity-90">{position.startLabel}</span>
        </div>
        {event.location ? (
          <span className="truncate italic opacity-90">{event.location}</span>
        ) : (
          <span />
        )}
        <div className="flex items-end justify-between gap-2">
          <span />
          <span className="shrink-0 text-[10px] uppercase opacity-90">
            End {position.endLabel}
          </span>
        </div>
      </div>
      {position.travelAfterHeight > 0 ? (
        <div
          className="absolute inset-x-0 bottom-0 bg-travel-time/40"
          style={{ height: position.travelAfterHeight }}
        />
      ) : null}
    </Link>
  );
}
