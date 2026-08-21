import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

type DateInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label?: string;
  error?: string;
  compact?: boolean;
};

export function DateInput({
  label,
  error,
  className,
  compact = false,
  id,
  ...props
}: DateInputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="flex min-w-0 max-w-full flex-col gap-1.5 overflow-hidden">
      {label ? (
        <label htmlFor={inputId} className="text-xs uppercase tracking-wide text-text-secondary">
          {label}
        </label>
      ) : null}
      <div className="min-w-0 max-w-full overflow-hidden rounded-lg">
        <input
          id={inputId}
          type="date"
          className={cn(
            "box-border block w-full max-w-full min-w-0 rounded-lg bg-surface text-text-primary",
            "outline-none ring-1 ring-transparent focus:ring-accent/50",
            "[color-scheme:dark]",
            compact ? "px-2 py-2 text-xs" : "px-3 py-2.5 text-sm",
            error && "ring-status-busy/50",
            className,
          )}
          {...props}
        />
      </div>
      {error ? <p className="text-xs text-status-busy">{error}</p> : null}
    </div>
  );
}
