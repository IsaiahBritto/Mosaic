"use client";

import { cn } from "@/lib/utils/cn";

type SharedBadgeProps = {
  onClick?: () => void;
  className?: string;
};

export function SharedBadge({ onClick, className }: SharedBadgeProps) {
  const label = "+shared";

  if (onClick) {
    return (
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onClick();
        }}
        aria-label="View sharing details"
        className={cn(
          "shrink-0 text-[10px] uppercase tracking-wide text-accent hover:underline",
          className,
        )}
      >
        {label}
      </button>
    );
  }

  return (
    <span
      className={cn(
        "shrink-0 text-[10px] uppercase tracking-wide text-accent",
        className,
      )}
    >
      {label}
    </span>
  );
}
