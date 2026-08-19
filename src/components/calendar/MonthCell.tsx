import Link from "next/link";
import type { DayAvailability, DayStatus } from "@/lib/calendar/availability";
import { withCalendarDateParam } from "@/lib/calendar/timezone";
import { cn } from "@/lib/utils/cn";

const DOT_COLORS: Record<DayStatus, string> = {
  free: "bg-status-free",
  busy: "bg-status-busy",
  partial: "bg-gradient-to-r from-status-busy to-status-free",
  holiday: "bg-status-holiday",
};

export function statusCellClass(status: DayStatus): string {
  switch (status) {
    case "free":
      return "bg-status-free/20";
    case "busy":
      return "bg-status-busy/25";
    case "partial":
      return "bg-gradient-to-b from-status-busy/30 to-status-free/20";
    case "holiday":
      return "bg-status-holiday/15";
    default:
      return "bg-surface/40";
  }
}

type MonthCellProps = {
  dateParam: string;
  isCurrentMonth?: boolean;
  isToday?: boolean;
  isSelected?: boolean;
  availability?: DayAvailability;
  compact?: boolean;
  href?: string;
};

export function MonthCell({
  dateParam,
  isCurrentMonth = true,
  isToday = false,
  isSelected = false,
  availability,
  compact = false,
  href,
}: MonthCellProps) {
  const status = availability?.status ?? "free";
  const linkHref = href ?? withCalendarDateParam("/day", dateParam);

  return (
    <Link
      href={linkHref}
      className={cn(
        "flex flex-col rounded-md transition-opacity hover:opacity-90",
        statusCellClass(status),
        compact ? "min-h-[2rem] p-0.5" : "min-h-[3.5rem] p-1",
        !isCurrentMonth && "opacity-40",
      )}
    >
      <span
        className={cn(
          "text-center",
          compact ? "text-[10px]" : isToday || isSelected ? "text-2xl font-extrabold" : "text-sm",
          isToday && "text-accent",
          !isToday && isSelected && "font-bold text-text-primary",
          !isToday && !isSelected && status === "holiday" && "text-status-holiday",
          !isToday && !isSelected && status !== "holiday" && "text-text-primary",
        )}
      >
        {Number(dateParam.slice(8))}
      </span>

      {!compact && availability?.dots?.length ? (
        <div className="mt-auto flex justify-center gap-0.5 pt-1">
          {availability.dots.map((dot, index) => (
            <span
              key={`${dateParam}-dot-${index}`}
              className={cn("h-1 w-1 rounded-full", DOT_COLORS[dot])}
            />
          ))}
        </div>
      ) : null}
    </Link>
  );
}
