"use client";

import type { Calendar, SidebarItem } from "@/types/calendar";
import { getVisibilityHeaderState } from "@/lib/integrations/google/calendar-display";
import { CalendarCheckbox } from "@/components/calendar/CalendarCheckbox";
import { CalendarRow } from "@/components/calendar/CalendarRow";
import { LinkedAccountCalendarGroup } from "@/components/calendar/LinkedAccountCalendarGroup";

type SidebarCalendarListProps = {
  items: SidebarItem[];
  visibleIds: string[];
  onToggle: (calendarId: string, visible: boolean) => void;
  onToggleGroup?: (calendarIds: string[], visible: boolean) => void;
  onEdit?: (calendar: Calendar) => void;
  onDelete?: (calendarId: string) => void;
  onManageCalendars?: (connectionId: string) => void;
  onEditConnectionLabel?: (
    connectionId: string,
    providerAccountEmail: string,
    displayName: string | null,
  ) => void;
  isConnectionCollapsed?: (connectionId: string) => boolean;
  onToggleConnectionCollapse?: (connectionId: string) => void;
  compact?: boolean;
  showDelete?: boolean;
  showSharedBadge?: boolean;
  onSharedClick?: (calendar: Calendar) => void;
};

function renderCalendarItem(
  calendar: Calendar,
  props: Pick<
    SidebarCalendarListProps,
    | "visibleIds"
    | "onToggle"
    | "onEdit"
    | "onDelete"
    | "compact"
    | "showDelete"
    | "showSharedBadge"
    | "onSharedClick"
  >,
) {
  const {
    visibleIds,
    onToggle,
    onEdit,
    onDelete,
    compact,
    showDelete,
    showSharedBadge,
    onSharedClick,
  } = props;

  if (compact) {
    return (
      <CalendarCheckbox
        key={calendar.id}
        calendar={calendar}
        checked={visibleIds.includes(calendar.id)}
        onToggle={(checked) => onToggle(calendar.id, checked)}
        onEdit={onEdit ? () => onEdit(calendar) : undefined}
        showSharedBadge={showSharedBadge}
        onSharedClick={onSharedClick}
      />
    );
  }

  return (
    <CalendarRow
      key={calendar.id}
      calendar={calendar}
      checked={visibleIds.includes(calendar.id)}
      onToggle={(checked) => onToggle(calendar.id, checked)}
      onEdit={onEdit ? () => onEdit(calendar) : undefined}
      onDelete={onDelete ? () => onDelete(calendar.id) : undefined}
      showDelete={showDelete}
    />
  );
}

export function SidebarCalendarList({
  items,
  visibleIds,
  onToggle,
  onToggleGroup,
  onEdit,
  onDelete,
  onManageCalendars,
  onEditConnectionLabel,
  isConnectionCollapsed,
  onToggleConnectionCollapse,
  compact = false,
  showDelete = false,
  showSharedBadge = false,
  onSharedClick,
}: SidebarCalendarListProps) {
  const itemProps = {
    visibleIds,
    onToggle,
    onEdit,
    onDelete,
    compact,
    showDelete,
    showSharedBadge,
    onSharedClick,
  };

  return (
    <div className="flex flex-col gap-2">
      {items.map((item) => {
        if (item.kind === "calendar") {
          return renderCalendarItem(item.calendar, itemProps);
        }

        const childIds = item.calendars.map((calendar) => calendar.id);
        const { allVisible } = getVisibilityHeaderState(visibleIds, childIds);
        const collapsed = isConnectionCollapsed?.(item.connectionId) ?? false;
        const isGoogle = item.provider === "google";

        return (
          <LinkedAccountCalendarGroup
            key={item.connectionId}
            accountEmail={item.title}
            connectionId={isGoogle ? item.connectionId : undefined}
            syncStatus={item.lastSyncStatus}
            syncError={item.lastSyncError}
            headerChecked={allVisible}
            onHeaderToggle={(checked) =>
              onToggleGroup?.(childIds, checked) ??
              childIds.forEach((id) => onToggle(id, checked))
            }
            onManageCalendars={
              isGoogle && onManageCalendars
                ? () => onManageCalendars(item.connectionId)
                : undefined
            }
            onEditHeader={
              isGoogle && onEditConnectionLabel
                ? () =>
                    onEditConnectionLabel(
                      item.connectionId,
                      item.providerAccountEmail,
                      item.accountDisplayName ?? null,
                    )
                : undefined
            }
            collapsible={isGoogle && Boolean(onToggleConnectionCollapse)}
            collapsed={collapsed}
            onToggleCollapse={
              onToggleConnectionCollapse
                ? () => onToggleConnectionCollapse(item.connectionId)
                : undefined
            }
            compact={compact}
          >
            {item.calendars.map((calendar) => renderCalendarItem(calendar, itemProps))}
          </LinkedAccountCalendarGroup>
        );
      })}
    </div>
  );
}
