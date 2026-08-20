"use client";

import { cn } from "@/lib/utils/cn";

export type ToggleProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  className?: string;
};

export function Toggle({ checked, onChange, label, className }: ToggleProps) {
  return (
    <label className={cn("inline-flex cursor-pointer items-center gap-2", className)}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "flex h-7 w-12 shrink-0 items-center rounded-full border-0 p-0.5 transition-colors",
          checked ? "bg-accent" : "bg-surface ring-1 ring-text-secondary/30",
        )}
      >
        <span
          className={cn(
            "block h-6 w-6 shrink-0 rounded-full bg-text-primary shadow-sm transition-[margin-left] duration-200 ease-out",
            checked ? "ml-auto" : "ml-0",
          )}
        />
      </button>
      {label ? <span className="text-sm text-text-secondary">{label}</span> : null}
    </label>
  );
}
