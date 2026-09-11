import { cn } from "@/lib/utils/cn";

type CollapseChevronProps = {
  collapsed: boolean;
  className?: string;
};

export function CollapseChevron({ collapsed, className }: CollapseChevronProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center text-xs leading-none text-text-secondary",
        className,
      )}
      aria-hidden
    >
      {collapsed ? "▼" : "▲"}
    </span>
  );
}
