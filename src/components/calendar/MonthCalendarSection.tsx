"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import type { CalendarGroup } from "@/types/calendar";
import { setCalendarVisibility } from "@/lib/actions/calendars";
import { setDayViewMode } from "@/lib/actions/views";
import { useAvailabilityDisplay } from "@/components/calendar/AvailabilityDisplayContext";
import { CalendarList } from "@/components/calendar/CalendarList";
import { useToast } from "@/components/ui/Toast";
import { Toggle } from "@/components/ui/Toggle";
import { formatDateParam } from "@/lib/calendar/date-params";
import { formatCalendarDate } from "@/lib/calendar/timezone";
import { buildReturnTo } from "@/lib/navigation/return-to";
import { cn } from "@/lib/utils/cn";

const COLLAPSED_KEY = "mosaic-month-calendars-collapsed";

type MonthCalendarSectionProps = {
  groups: CalendarGroup[];
  visibleIds: string[];
  selectedDate: Date;
  showEmptyHint?: boolean;
  variant?: "month" | "week";
  defaultViewMode?: "timeline" | "agenda";
  displayTimezone?: string;
};

export function MonthCalendarSection({
  groups,
  visibleIds,
  selectedDate,
  showEmptyHint = false,
  variant = "month",
  defaultViewMode = "timeline",
  displayTimezone,
}: MonthCalendarSectionProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const { mode, setMode, isPending: modePending } = useAvailabilityDisplay();
  const [isPending, startTransition] = useTransition();
  const [viewModePending, startViewModeTransition] = useTransition();
  const [collapsed, setCollapsed] = useState(false);
  const [collapsePrefReady, setCollapsePrefReady] = useState(false);
  const dateParam = formatDateParam(selectedDate);
  const calendarDateParam =
    displayTimezone != null
      ? formatCalendarDate(selectedDate, displayTimezone)
      : dateParam;
  const returnTo = buildReturnTo(pathname, searchParams.toString());
  const newEventHref = `/events/new?date=${calendarDateParam}&returnTo=${returnTo}`;
  const isWeekVariant = variant === "week";

  const viewParam = searchParams.get("view");
  const isAgenda =
    isWeekVariant &&
    (viewParam === "agenda" || (!viewParam && defaultViewMode === "agenda"));

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

  function handleCalendarVisibilityToggle(calendarId: string, visible: boolean) {
    startTransition(async () => {
      const result = await setCalendarVisibility({ calendarId, visible });
      if (!result.success) {
        showToast(result.message, "error");
        return;
      }
      router.refresh();
    });
  }

  function handleViewModeToggle(checked: boolean) {
    const mode = checked ? "agenda" : "timeline";
    const params = new URLSearchParams(searchParams.toString());
    params.set("date", calendarDateParam);

    if (checked) {
      params.set("view", "agenda");
    } else {
      params.delete("view");
    }

    router.replace(`${pathname}?${params.toString()}`);

    startViewModeTransition(async () => {
      await setDayViewMode(mode);
    });
  }

  const expandablePanel = (
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
          onToggle={handleCalendarVisibilityToggle}
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
  );

  const calendarsToolbar = (
    <div className="relative flex items-center justify-between border-b border-surface px-4 py-3">
      <div className="relative z-10 shrink-0">
        {isWeekVariant ? (
          <Toggle
            checked={isAgenda}
            onChange={handleViewModeToggle}
            label=""
            className={viewModePending ? "opacity-50" : undefined}
          />
        ) : (
          <span className="inline-block w-12" aria-hidden />
        )}
      </div>

      <button
        type="button"
        onClick={() => setCollapsed((current) => !current)}
        className="absolute left-1/2 top-1/2 z-[1] -translate-x-1/2 -translate-y-1/2"
        aria-expanded={!collapsed}
      >
        <span className="relative inline-block leading-none">
          <span className="text-sm font-bold uppercase tracking-wide text-text-secondary">
            Calendars
          </span>
          <span className="absolute left-full ml-1.5 inset-y-0 flex items-center text-xs leading-none text-text-secondary">
            {collapsed ? "▼" : "▲"}
          </span>
        </span>
      </button>

      <Link
        href={newEventHref}
        className="relative z-10 shrink-0 rounded-full bg-surface px-3 py-1.5 text-sm font-medium text-accent ring-1 ring-accent/30"
      >
        + Event
      </Link>
    </div>
  );

  return (
    <div className="mt-auto border-t border-surface">
      {calendarsToolbar}

      {expandablePanel}
    </div>
  );
}
