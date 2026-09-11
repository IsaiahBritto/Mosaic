"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import type { Calendar, SidebarItem } from "@/types/calendar";
import { EditCalendarDialog } from "@/components/calendar/EditCalendarDialog";
import { EditLinkedAccountDialog } from "@/components/calendar/EditLinkedAccountDialog";
import { ReorderCalendarList } from "@/components/calendar/ReorderCalendarList";
import { SidebarCalendarList } from "@/components/calendar/SidebarCalendarList";
import { saveSidebarCalendarOrder, setCalendarVisibility } from "@/lib/actions/calendars";
import type { SidebarCalendarOrder } from "@/lib/calendar/sidebar-order";
import { useConnectionCollapse } from "@/hooks/useConnectionCollapse";
import { setDayViewMode } from "@/lib/actions/views";
import { useAvailabilityDisplay } from "@/components/calendar/AvailabilityDisplayContext";
import { SharedCalendarPanel } from "@/components/calendar/SharedCalendarPanel";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { CollapseChevron } from "@/components/ui/CollapseChevron";
import { Toggle } from "@/components/ui/Toggle";
import { formatDateParam } from "@/lib/calendar/date-params";
import { formatCalendarDate } from "@/lib/calendar/timezone";
import { buildReturnTo } from "@/lib/navigation/return-to";
import { cn } from "@/lib/utils/cn";

const COLLAPSED_KEY = "mosaic-month-calendars-collapsed";

type MonthCalendarSectionProps = {
  sidebarItems: SidebarItem[];
  sidebarOrder: SidebarCalendarOrder;
  visibleIds: string[];
  selectedDate: Date;
  showEmptyHint?: boolean;
  variant?: "month" | "week";
  defaultViewMode?: "timeline" | "agenda";
  displayTimezone?: string;
};

export function MonthCalendarSection({
  sidebarItems,
  sidebarOrder,
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
  const [editingCalendar, setEditingCalendar] = useState<Calendar | null>(null);
  const [editingConnection, setEditingConnection] = useState<{
    id: string;
    providerAccountEmail: string;
    displayName: string | null;
  } | null>(null);
  const [sharedCalendar, setSharedCalendar] = useState<Calendar | null>(null);
  const [reorderMode, setReorderMode] = useState(false);
  const [draftOrder, setDraftOrder] = useState<SidebarCalendarOrder>(sidebarOrder);
  const { isCollapsed, toggleCollapsed } = useConnectionCollapse();
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

  useEffect(() => {
    if (!reorderMode) {
      setDraftOrder(sidebarOrder);
    }
  }, [sidebarOrder, reorderMode]);

  function handleStartReorder() {
    setDraftOrder(sidebarOrder);
    setReorderMode(true);
  }

  function handleCancelReorder() {
    setDraftOrder(sidebarOrder);
    setReorderMode(false);
  }

  function handleSaveReorder() {
    startTransition(async () => {
      const result = await saveSidebarCalendarOrder({ items: draftOrder.items });
      if (!result.success) {
        showToast(result.message, "error");
        return;
      }
      showToast("Calendar order saved");
      setReorderMode(false);
      router.refresh();
    });
  }

  function handleToggleGroup(calendarIds: string[], visible: boolean) {
    startTransition(async () => {
      for (const calendarId of calendarIds) {
        const result = await setCalendarVisibility({ calendarId, visible });
        if (!result.success) {
          showToast(result.message, "error");
          return;
        }
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
        "flex flex-col overflow-hidden transition-all duration-200 ease-out",
        collapsed ? "max-h-0 opacity-0" : "max-h-[32rem] opacity-100",
      )}
    >
      <div className="flex min-h-0 flex-1 flex-col space-y-4 overflow-y-auto px-4 pt-4 pb-2">
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

        {reorderMode ? (
          <ReorderCalendarList
            items={sidebarItems}
            order={draftOrder}
            onOrderChange={setDraftOrder}
          />
        ) : (
          <>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleStartReorder}
                className="text-xs uppercase tracking-wide text-accent hover:underline"
              >
                Edit order
              </button>
            </div>
            <SidebarCalendarList
              items={sidebarItems}
              visibleIds={visibleIds}
              onToggle={handleCalendarVisibilityToggle}
              onToggleGroup={handleToggleGroup}
              onEditConnectionLabel={(connectionId, providerAccountEmail, displayName) =>
                setEditingConnection({ id: connectionId, providerAccountEmail, displayName })
              }
              onEdit={setEditingCalendar}
              onSharedClick={setSharedCalendar}
              isConnectionCollapsed={isCollapsed}
              onToggleConnectionCollapse={toggleCollapsed}
              compact
              showSharedBadge
            />
          </>
        )}

        {showEmptyHint ? (
          <p className="text-center text-sm text-text-secondary">
            Select calendars to show
          </p>
        ) : null}

        {isPending ? (
          <p className="text-center text-xs text-text-secondary">Updating…</p>
        ) : null}
      </div>

      <div className="shrink-0 border-t border-surface/60 px-4 py-3">
        {reorderMode ? (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={handleSaveReorder} disabled={isPending}>
              {isPending ? "Saving…" : "Done"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancelReorder}
              disabled={isPending}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Link
            href="/calendars"
            className="block rounded-full bg-surface py-3 text-center text-sm text-accent ring-1 ring-accent/20"
          >
            New Calendar
          </Link>
        )}
      </div>

      {editingCalendar ? (
        <EditCalendarDialog
          calendar={editingCalendar}
          onClose={() => setEditingCalendar(null)}
        />
      ) : null}

      {editingConnection ? (
        <EditLinkedAccountDialog
          connectionId={editingConnection.id}
          providerAccountEmail={editingConnection.providerAccountEmail}
          displayName={editingConnection.displayName}
          onClose={() => setEditingConnection(null)}
        />
      ) : null}
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
          <span className="absolute left-full ml-1.5 inset-y-0 flex items-center">
            <CollapseChevron collapsed={collapsed} />
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

      <SharedCalendarPanel
        calendarId={sharedCalendar?.id ?? null}
        calendarName={sharedCalendar?.name}
        onClose={() => setSharedCalendar(null)}
      />
    </div>
  );
}
