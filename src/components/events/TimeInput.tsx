import { cn } from "@/lib/utils/cn";

export const TIME_INTERVAL_MINUTES = 15;

const TIME_OPTIONS = Array.from(
  { length: (24 * 60) / TIME_INTERVAL_MINUTES },
  (_, index) => {
    const totalMinutes = index * TIME_INTERVAL_MINUTES;
    const hours = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
    const minutes = String(totalMinutes % 60).padStart(2, "0");
    return `${hours}:${minutes}`;
  },
);

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function getTimeOptions(minTime?: string): string[] {
  if (!minTime) {
    return TIME_OPTIONS;
  }

  const minMinutes = timeToMinutes(minTime);
  return TIME_OPTIONS.filter((time) => timeToMinutes(time) > minMinutes);
}

export function getNextTimeSlot(time: string): string | undefined {
  return getTimeOptions(time)[0];
}

type TimeInputProps = {
  label?: string;
  value?: string;
  onChange: (value: string) => void;
  error?: string;
  className?: string;
  disabled?: boolean;
  minTime?: string;
};

export function TimeInput({
  label,
  value,
  onChange,
  error,
  className,
  disabled,
  minTime,
}: TimeInputProps) {
  const inputId = label?.toLowerCase().replace(/\s+/g, "-");
  const options = getTimeOptions(minTime);

  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      {label ? (
        <label htmlFor={inputId} className="text-xs uppercase tracking-wide text-text-secondary">
          {label}
        </label>
      ) : null}
      <select
        id={inputId}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={cn(
          "w-full min-w-0 rounded-lg bg-surface px-3 py-2.5 text-sm text-text-primary",
          "outline-none ring-1 ring-transparent focus:ring-accent/50",
          error && "ring-status-busy/50",
          disabled && "opacity-50",
        )}
      >
        <option value="">Select time</option>
        {options.map((time) => (
          <option key={time} value={time}>
            {formatTimeLabel(time)}
          </option>
        ))}
      </select>
      {error ? <p className="text-xs text-status-busy">{error}</p> : null}
    </div>
  );
}

function formatTimeLabel(time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const displayHour = hours % 12 === 0 ? 12 : hours % 12;
  return `${displayHour}:${String(minutes).padStart(2, "0")} ${period}`;
}
