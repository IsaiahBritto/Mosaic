import { cn } from "@/lib/utils/cn";

const TIME_OPTIONS = Array.from({ length: 48 }, (_, index) => {
  const hours = String(Math.floor(index / 2)).padStart(2, "0");
  const minutes = index % 2 === 0 ? "00" : "30";
  return `${hours}:${minutes}`;
});

type TimeInputProps = {
  label?: string;
  value?: string;
  onChange: (value: string) => void;
  error?: string;
  className?: string;
  disabled?: boolean;
};

export function TimeInput({
  label,
  value,
  onChange,
  error,
  className,
  disabled,
}: TimeInputProps) {
  const inputId = label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
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
          "w-full rounded-lg bg-surface px-3 py-2.5 text-sm text-text-primary",
          "outline-none ring-1 ring-transparent focus:ring-accent/50",
          error && "ring-status-busy/50",
          disabled && "opacity-50",
        )}
      >
        <option value="">Select time</option>
        {TIME_OPTIONS.map((time) => (
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
