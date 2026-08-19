import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

type DateInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label?: string;
  error?: string;
};

export function DateInput({ label, error, className, id, ...props }: DateInputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="flex flex-col gap-1.5">
      {label ? (
        <label htmlFor={inputId} className="text-xs uppercase tracking-wide text-text-secondary">
          {label}
        </label>
      ) : null}
      <input
        id={inputId}
        type="date"
        className={cn(
          "w-full rounded-lg bg-surface px-3 py-2.5 text-sm text-text-primary",
          "outline-none ring-1 ring-transparent focus:ring-accent/50",
          "[color-scheme:dark]",
          error && "ring-status-busy/50",
          className,
        )}
        {...props}
      />
      {error ? <p className="text-xs text-status-busy">{error}</p> : null}
    </div>
  );
}
