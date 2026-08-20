"use client";

import { useEffect, useState } from "react";
import { useAvailabilityDisplay } from "@/components/calendar/AvailabilityDisplayContext";
import { cn } from "@/lib/utils/cn";

const COLLAPSED_KEY = "mosaic-availability-panel-collapsed";

type LegendCalendar = {
  id: string;
  name: string;
  colorHex: string;
};

type AvailabilityDisplayPanelProps = {
  calendars: LegendCalendar[];
};

const GENERAL_LEGEND = [
  { color: "bg-status-free", label: "You Are Free" },
  { color: "bg-status-busy", label: "You Have Plans" },
  {
    color: "bg-gradient-to-r from-status-busy to-status-free",
    label: "You Made Partial Plans",
  },
  { color: "bg-status-holiday", label: "Holiday" },
] as const;

export function AvailabilityDisplayPanel({
  calendars,
}: AvailabilityDisplayPanelProps) {
  const { mode, setMode, isPending } = useAvailabilityDisplay();
  const [collapsed, setCollapsed] = useState(false);
  const [collapsePrefReady, setCollapsePrefReady] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem(COLLAPSED_KEY) === "true");
    setCollapsePrefReady(true);
  }, []);

  useEffect(() => {
    if (!collapsePrefReady) {
      return;
    }
    localStorage.setItem(COLLAPSED_KEY, String(collapsed));
  }, [collapsed, collapsePrefReady]);

  function toggleCollapsed() {
    setCollapsed((current) => !current);
  }

  return (
    <div className="border-b border-surface">
      <button
        type="button"
        onClick={toggleCollapsed}
        className="flex w-full items-center justify-between px-4 py-2 text-left text-xs font-bold uppercase tracking-widest text-text-secondary"
        aria-expanded={!collapsed}
      >
        <span>Display</span>
        <span className="text-sm">{collapsed ? "›" : "‹"}</span>
      </button>

      <div
        className={cn(
          "overflow-hidden transition-all duration-200 ease-out",
          collapsed ? "max-h-0 opacity-0" : "max-h-64 opacity-100",
        )}
      >
        <div className="space-y-3 px-4 pb-3">
          <div
            className={cn(
              "grid grid-cols-2 rounded-full bg-surface p-0.5 text-[10px] font-bold uppercase tracking-wide",
              isPending && "opacity-50",
            )}
          >
            <button
              type="button"
              onClick={() => setMode("general")}
              className={cn(
                "rounded-full py-1.5 transition-colors",
                mode === "general"
                  ? "bg-accent text-background"
                  : "text-text-secondary",
              )}
            >
              General
            </button>
            <button
              type="button"
              onClick={() => setMode("specific")}
              className={cn(
                "rounded-full py-1.5 transition-colors",
                mode === "specific"
                  ? "bg-accent text-background"
                  : "text-text-secondary",
              )}
            >
              Specific
            </button>
          </div>

          {mode === "general" ? (
            <div className="grid grid-cols-2 gap-2 text-[10px] uppercase tracking-wide text-text-secondary">
              {GENERAL_LEGEND.map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", item.color)} />
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 text-[10px] uppercase tracking-wide text-text-secondary">
              {calendars.map((calendar) => (
                <div key={calendar.id} className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: calendar.colorHex }}
                  />
                  <span className="truncate">{calendar.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
