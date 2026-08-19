"use client";

import { CALENDAR_PALETTE } from "@/lib/theme/colors";
import { cn } from "@/lib/utils/cn";

type ColorPickerProps = {
  value: string;
  onChange: (hex: string) => void;
  className?: string;
};

export function ColorPicker({ value, onChange, className }: ColorPickerProps) {
  return (
    <div className={cn("grid grid-cols-7 gap-2", className)}>
      {CALENDAR_PALETTE.map((hex) => (
        <button
          key={hex}
          type="button"
          aria-label={`Select color ${hex}`}
          onClick={() => onChange(hex)}
          className={cn(
            "h-8 w-8 rounded-full border-2 transition-transform hover:scale-105",
            value === hex ? "border-text-primary ring-2 ring-text-primary/40" : "border-transparent",
          )}
          style={{ backgroundColor: hex }}
        />
      ))}
    </div>
  );
}
