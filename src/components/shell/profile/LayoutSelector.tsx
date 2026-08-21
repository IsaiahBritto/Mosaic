"use client";

import { useTransition } from "react";
import type { ShellLayout } from "@/lib/actions/views";
import { setShellLayout } from "@/lib/actions/views";
import { SHELL_LAYOUT_OPTIONS } from "@/lib/shell/layout-order";
import { useShellLayout } from "@/components/shell/ShellLayoutProvider";
import { useToast } from "@/components/ui/Toast";
import { LayoutPreview, YearLayoutPreview } from "@/components/shell/profile/LayoutPreview";
import { cn } from "@/lib/utils/cn";

export function LayoutSelector() {
  const { layout, setLayout } = useShellLayout();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();

  function handleSelect(next: ShellLayout) {
    if (next === layout || isPending) {
      return;
    }

    const previous = layout;
    setLayout(next);

    startTransition(async () => {
      const result = await setShellLayout(next);
      if (!result.success) {
        setLayout(previous);
        showToast(result.message, "error");
      }
    });
  }

  return (
    <section>
      <h3 className="mb-1 text-xs font-bold uppercase tracking-widest text-text-secondary">
        View layout
      </h3>
      <p className="mb-3 text-xs text-text-secondary">
        Choose how Week and Month screens are arranged.
      </p>

      <div className="flex flex-col gap-2">
        {SHELL_LAYOUT_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            disabled={isPending}
            onClick={() => handleSelect(option.value)}
            className={cn(
              "flex items-start gap-3 rounded-xl border p-3 text-left transition-colors",
              layout === option.value
                ? "border-accent bg-accent/5"
                : "border-surface hover:border-accent/40",
              isPending && "opacity-70",
            )}
          >
            <LayoutPreview layout={option.value} selected={layout === option.value} />
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-sm font-medium text-text-primary">{option.label}</p>
              <p className="mt-0.5 text-xs text-text-secondary">{option.description}</p>
            </div>
          </button>
        ))}
      </div>

      <div className="mt-4 rounded-xl border border-surface p-3">
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-text-secondary">
          Year view (fixed)
        </p>
        <YearLayoutPreview />
        <p className="mt-2 text-xs text-text-secondary">
          Year always shows Mosaic, navigation, then the year grid.
        </p>
      </div>
    </section>
  );
}
