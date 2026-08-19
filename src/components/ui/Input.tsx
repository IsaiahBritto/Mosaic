import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
};

export function Input({ label, error, className, id, ...props }: InputProps) {
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
        className={cn(
          "w-full rounded-lg bg-surface px-3 py-2.5 text-base text-text-primary",
          "placeholder:text-text-secondary/60 outline-none ring-1 ring-transparent",
          "focus:ring-accent/50",
          error && "ring-status-busy/50",
          className,
        )}
        {...props}
      />
      {error ? <p className="text-xs text-status-busy">{error}</p> : null}
    </div>
  );
}
