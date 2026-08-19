"use client";

import { cn } from "@/lib/utils/cn";

export type CheckboxProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  color?: string;
  className?: string;
};

export function Checkbox({
  checked,
  onChange,
  label,
  color = "#D4AF37",
  className,
}: CheckboxProps) {
  return (
    <label className={cn("inline-flex cursor-pointer items-center gap-2", className)}>
      <span
        role="checkbox"
        aria-checked={checked}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === " " || e.key === "Enter") {
            e.preventDefault();
            onChange(!checked);
          }
        }}
        onClick={() => onChange(!checked)}
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-text-secondary/50"
        style={{
          backgroundColor: checked ? color : "transparent",
          borderColor: checked ? color : undefined,
        }}
      >
        {checked ? (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
            <path
              d="M2 6l3 3 5-5"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : null}
      </span>
      {label ? <span className="text-sm text-text-primary">{label}</span> : null}
    </label>
  );
}
