"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { DayAvailability, DayStatus } from "@/lib/calendar/availability";
import { neutralCellClass, statusCellClass } from "@/lib/calendar/availability";
import { useAvailabilityDisplayMode } from "@/components/calendar/AvailabilityDisplayContext";
import { cn } from "@/lib/utils/cn";

const DOT_COLORS: Record<Exclude<DayStatus, "partial">, string> = {
  free: "bg-status-free",
  busy: "bg-status-busy",
  holiday: "bg-status-holiday",
};

type MonthCellProps = {
  dateParam: string;
  isCurrentMonth?: boolean;
  isToday?: boolean;
  isSelected?: boolean;
  availability?: DayAvailability;
  compact?: boolean;
};

function PartialDot() {
  return (
    <span className="flex h-1 w-1 overflow-hidden rounded-full">
      <span className="w-1/2 bg-status-busy" />
      <span className="w-1/2 bg-status-free" />
    </span>
  );
}

export function MonthCell({
  dateParam,
  isCurrentMonth = true,
  isToday = false,
  isSelected = false,
  availability,
  compact = false,
}: MonthCellProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = useAvailabilityDisplayMode();
  const isSpecific = mode === "specific";
  const status = availability?.status ?? "free";
  const busyRatio = availability?.busyRatio ?? 0;
  const showPartialSplit = !isSpecific && status === "partial" && busyRatio > 0;

  function handleSelect() {
    const params = new URLSearchParams(searchParams.toString());
    params.set("date", dateParam);
    params.delete("select");
    router.push(`/month?${params.toString()}`, { scroll: false });
  }

  return (
    <button
      type="button"
      onClick={handleSelect}
      className={cn(
        "relative flex flex-col overflow-hidden rounded-md transition-opacity hover:opacity-90",
        !showPartialSplit && (isSpecific ? neutralCellClass() : statusCellClass(status)),
        compact ? "min-h-[2rem] p-0.5" : "min-h-[3.5rem] p-1",
        !isCurrentMonth && "opacity-40",
        isSelected && isToday && "ring-2 ring-accent",
        isSelected && !isToday && "ring-2 ring-white",
      )}
    >
      {showPartialSplit ? (
        <div className="absolute inset-0 flex flex-col">
          <div
            className="bg-status-busy/30"
            style={{ flex: Math.max(busyRatio, 0.05) }}
          />
          <div className="h-px shrink-0 bg-background/80" />
          <div
            className="bg-status-free/20"
            style={{ flex: Math.max(1 - busyRatio, 0.05) }}
          />
        </div>
      ) : null}

      <span
        className={cn(
          "relative z-10 text-center",
          compact ? "text-[10px]" : isToday ? "text-2xl font-extrabold" : "text-sm",
          isToday && "text-accent",
          !isToday && !isSpecific && status === "holiday" && "text-status-holiday",
          !isToday && (isSpecific || status !== "holiday") && "text-text-primary",
        )}
      >
        {Number(dateParam.slice(8))}
      </span>

      {!compact && isSpecific && (availability?.calendarDots?.length ?? 0) > 0 ? (
        <div className="relative z-10 mt-auto flex justify-center gap-0.5 pt-1">
          {availability!.calendarDots.slice(0, 5).map((dot) => (
            <span
              key={`${dateParam}-${dot.calendarId}`}
              className="h-1 w-1 rounded-full"
              style={{ backgroundColor: dot.colorHex }}
            />
          ))}
        </div>
      ) : null}

      {!compact && !isSpecific && availability?.dots?.length ? (
        <div className="relative z-10 mt-auto flex justify-center gap-0.5 pt-1">
          {availability.dots.map((dot, index) =>
            dot === "partial" ? (
              <PartialDot key={`${dateParam}-dot-${index}`} />
            ) : (
              <span
                key={`${dateParam}-dot-${index}`}
                className={cn("h-1 w-1 rounded-full", DOT_COLORS[dot])}
              />
            ),
          )}
        </div>
      ) : null}
    </button>
  );
}
