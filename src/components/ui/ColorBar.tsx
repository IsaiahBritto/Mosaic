import { cn } from "@/lib/utils/cn";

export type ColorBarProps = {
  color: string;
  className?: string;
};

export function ColorBar({ color, className }: ColorBarProps) {
  return (
    <span
      className={cn("inline-block w-1 shrink-0 self-stretch rounded-full", className)}
      style={{ backgroundColor: color }}
      aria-hidden
    />
  );
}
