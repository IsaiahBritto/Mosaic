import type { WritableCalendarOption } from "@/types/event";
import { ColorBar } from "@/components/ui/ColorBar";
import { cn } from "@/lib/utils/cn";

type CalendarSelectProps = {
  calendars: WritableCalendarOption[];
  value: string;
  onChange: (calendarId: string) => void;
  error?: string;
  className?: string;
};

export function CalendarSelect({
  calendars,
  value,
  onChange,
  error,
  className,
}: CalendarSelectProps) {
  const selected = calendars.find((c) => c.id === value);

  return (
    <div
      className={cn(
        "flex items-stretch gap-3 rounded-lg bg-surface/60 px-3 py-3",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <label htmlFor="calendar" className="text-xs uppercase tracking-wide text-text-secondary">
          Calendar
        </label>
        <select
          id="calendar"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "w-full rounded-lg bg-background px-3 py-2.5 text-sm uppercase tracking-wide text-text-primary",
            "outline-none ring-1 ring-transparent focus:ring-accent/50",
            error && "ring-status-busy/50",
          )}
        >
          {calendars.map((calendar) => (
            <option key={calendar.id} value={calendar.id}>
              {calendar.name}
            </option>
          ))}
        </select>
        {error ? <p className="text-xs text-status-busy">{error}</p> : null}
      </div>
      <ColorBar
        color={selected?.colorHex ?? "#9379E0"}
        className="w-2 rounded-sm"
      />
    </div>
  );
}
