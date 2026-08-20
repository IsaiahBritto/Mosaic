import { cn } from "@/lib/utils/cn";

type EventCardContentProps = {
  title: string;
  location?: string | null;
  startTime: string;
  endTime: string;
  isAllDay?: boolean;
  isRecurring?: boolean;
  textOnColor?: boolean;
  className?: string;
};

export function EventCardContent({
  title,
  location,
  startTime,
  endTime,
  isAllDay = false,
  isRecurring = false,
  textOnColor = false,
  className,
}: EventCardContentProps) {
  const primaryClass = textOnColor
    ? "text-background"
    : "text-text-primary";
  const secondaryClass = textOnColor
    ? "text-background/80"
    : "text-text-secondary";

  return (
    <div className={cn("flex min-w-0 flex-1 flex-col gap-1", className)}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-start gap-1.5">
          {isRecurring ? (
            <span
              className={cn("shrink-0 text-xs", secondaryClass)}
              title="Repeating event"
              aria-label="Repeating event"
            >
              ↻
            </span>
          ) : null}
          <p className={cn("truncate text-sm font-semibold uppercase", primaryClass)}>
            {title}
          </p>
        </div>
        <p className={cn("shrink-0 text-xs font-semibold", primaryClass)}>
          {isAllDay ? "All day" : startTime}
        </p>
      </div>

      {location ? (
        <p className={cn("truncate text-xs italic", secondaryClass)}>{location}</p>
      ) : null}

      {!isAllDay ? (
        <p className={cn("self-end text-xs", secondaryClass)}>End {endTime}</p>
      ) : null}
    </div>
  );
}

type TravelZoneProps = {
  label?: string;
  calendarColor: string;
  className?: string;
  style?: React.CSSProperties;
};

export function TravelZone({
  label = "Travel time",
  calendarColor,
  className,
  style,
}: TravelZoneProps) {
  return (
    <div
      className={cn(
        "flex items-center px-2 py-0.5 text-[10px] uppercase italic text-background/90",
        className,
      )}
      style={{ backgroundColor: `${calendarColor}99`, ...style }}
    >
      {label}
    </div>
  );
}
