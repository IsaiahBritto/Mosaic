import { getUserTimezone } from "@/lib/calendar/timezone";
import { cn } from "@/lib/utils/cn";

export const COMMON_TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Anchorage",
  "Pacific/Honolulu",
  "UTC",
] as const;

type TimezoneSelectProps = {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  className?: string;
};

export function TimezoneSelect({
  value,
  onChange,
  error,
  className,
}: TimezoneSelectProps) {
  const detected = typeof window !== "undefined" ? getUserTimezone() : value;
  const options = [
    ...new Set([detected, ...COMMON_TIMEZONES, value].filter(Boolean)),
  ];

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor="timezone" className="text-xs uppercase tracking-wide text-text-secondary">
        Zone
      </label>
      <select
        id="timezone"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "w-full rounded-lg bg-surface px-3 py-2.5 text-sm text-text-primary",
          "outline-none ring-1 ring-transparent focus:ring-accent/50",
          error && "ring-status-busy/50",
        )}
      >
        {options.map((tz) => (
          <option key={tz} value={tz}>
            {tz.replace(/_/g, " ")}
          </option>
        ))}
      </select>
      {error ? <p className="text-xs text-status-busy">{error}</p> : null}
    </div>
  );
}
