import type { ShellLayout } from "@/lib/actions/views";
import {
  getShellBlockOrder,
  PREVIEW_BLOCK_LABELS,
  type ShellBlockKey,
} from "@/lib/shell/layout-order";
import { cn } from "@/lib/utils/cn";

type LayoutPreviewProps = {
  layout: ShellLayout;
  selected?: boolean;
  compact?: boolean;
};

const BLOCK_STYLES: Record<ShellBlockKey, string> = {
  tabs: "bg-surface/80 text-[8px] tracking-wide",
  period: "bg-surface/60 text-[8px]",
  calendar: "bg-accent/10 text-[8px] min-h-[28px]",
  calendars: "bg-surface/40 text-[8px]",
  events: "bg-surface/50 text-[8px] min-h-[24px]",
};

export function LayoutPreview({
  layout,
  selected = false,
  compact = false,
}: LayoutPreviewProps) {
  const order = getShellBlockOrder(layout);

  return (
    <div
      className={cn(
        "flex flex-col gap-0.5 rounded-lg border p-2",
        selected ? "border-accent bg-accent/5" : "border-surface bg-background",
        compact ? "w-full" : "w-28",
      )}
    >
      <div className="rounded px-1 py-0.5 text-center text-[8px] font-bold text-text-secondary">
        Mosaic
      </div>
      {order.map((key) => (
        <div
          key={key}
          className={cn(
            "rounded px-1 py-1 text-center font-medium text-text-secondary",
            BLOCK_STYLES[key],
          )}
        >
          {PREVIEW_BLOCK_LABELS[key]}
        </div>
      ))}
    </div>
  );
}

export function YearLayoutPreview() {
  return (
    <div className="flex w-full flex-col gap-0.5 rounded-lg border border-surface bg-background p-2 opacity-80">
      <div className="rounded px-1 py-0.5 text-center text-[8px] font-bold text-text-secondary">
        Mosaic
      </div>
      <div className="rounded bg-surface/80 px-1 py-1 text-center text-[8px] text-text-secondary">
        Week · Month · Year
      </div>
      <div className="rounded bg-surface/60 px-1 py-1 text-center text-[8px] text-text-secondary">
        Date
      </div>
      <div className="rounded bg-accent/10 px-1 py-2 text-center text-[8px] text-text-secondary">
        Year grid
      </div>
    </div>
  );
}
