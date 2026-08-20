"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import type { CalendarGroup } from "@/types/calendar";
import { setCalendarVisibility } from "@/lib/actions/calendars";
import { useAvailabilityDisplay } from "@/components/calendar/AvailabilityDisplayContext";
import { CalendarList } from "@/components/calendar/CalendarList";
import { useToast } from "@/components/ui/Toast";
import { formatDateParam } from "@/lib/calendar/date-params";
import { buildReturnTo } from "@/lib/navigation/return-to";
import { cn } from "@/lib/utils/cn";

const COLLAPSED_KEY = "mosaic-month-calendars-collapsed";

type MonthCalendarSectionProps = {
  groups: CalendarGroup[];
  visibleIds: string[];
  selectedDate: Date;
  showEmptyHint?: boolean;
};

export function MonthCalendarSection({
  groups,
  visibleIds,
  selectedDate,
  showEmptyHint = false,
}: MonthCalendarSectionProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const { mode, setMode, isPending: modePending } = useAvailabilityDisplay();
  const [isPending, startTransition] = useTransition();
  const [collapsed, setCollapsed] = useState(false);
  const [collapsePrefReady, setCollapsePrefReady] = useState(false);
  const dateParam = formatDateParam(selectedDate);
  const returnTo = buildReturnTo(pathname, searchParams.toString());

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

  function handleToggle(calendarId: string, visible: boolean) {
    startTransition(async () => {
      const result = await setCalendarVisibility({ calendarId, visible });
      if (!result.success) {
        showToast(result.message, "error");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="mt-auto border-t border-surface">
      <button
        type="button"
        onClick={() => setCollapsed((current) => !current)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
        aria-expanded={!collapsed}
      >
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-text-secondary">
            Calendars
          </p>
          <p className="text-[10px] uppercase tracking-wide text-accent">
            Select to show
          </p>
        </div>
        <span className="text-sm text-text-secondary">{collapsed ? "▼" : "▲"}</span>
      </button>

      <div
        className={cn(
          "overflow-hidden transition-all duration-200 ease-out",
          collapsed ? "max-h-0 opacity-0" : "max-h-[32rem] opacity-100",
        )}
      >
        <div className="space-y-4 px-4 pb-4">
          <div
            className={cn(
              "grid grid-cols-2 rounded-full bg-surface p-0.5 text-[10px] font-bold uppercase tracking-wide",
              modePending && "opacity-50",
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
              Availability
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
              Schedule
            </button>
          </div>

          <CalendarList
            groups={groups}
            visibleIds={visibleIds}
            onToggle={handleToggle}
            compact
            hideGroupHeaders
            showSharedBadge
          />

          {showEmptyHint ? (
            <p className="text-center text-sm text-text-secondary">
              Select calendars to show
            </p>
          ) : null}

          {isPending ? (
            <p className="text-center text-xs text-text-secondary">Updating…</p>
          ) : null}

          <Link
            href="/calendars"
            className="block rounded-full bg-surface py-3 text-center text-sm text-accent ring-1 ring-accent/20"
          >
            New Calendar
          </Link>
        </div>
      </div>

      <div className="flex justify-end border-t border-surface px-4 py-3">
        <Link
          href={`/events/new?date=${dateParam}&returnTo=${returnTo}`}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-surface text-lg text-accent ring-1 ring-accent/30"
          aria-label="New event"
        >
          +
        </Link>
      </div>
    </div>
  );
}
