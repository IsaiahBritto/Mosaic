"use client";

import type { Calendar, CalendarGroup } from "@/types/calendar";
import { getVisibilityHeaderState } from "@/lib/integrations/google/calendar-display";
import { CalendarRow } from "@/components/calendar/CalendarRow";
import { CalendarCheckbox } from "@/components/calendar/CalendarCheckbox";
import { LinkedAccountCalendarGroup } from "@/components/calendar/LinkedAccountCalendarGroup";
import { cn } from "@/lib/utils/cn";

type CalendarListProps = {
  groups: CalendarGroup[];
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
  compact?: boolean;
  showDelete?: boolean;
  hideGroupHeaders?: boolean;
  showSharedBadge?: boolean;
  onSharedClick?: (calendar: Calendar) => void;
};

function isLinkedAccountGroup(group: CalendarGroup): boolean {
  return (
    (group.label === "LINKED_GOOGLE" || group.label === "LINKED_APPLE") &&
    group.accountEmail != null &&
    group.connectionId != null
  );
}

function renderCalendarItem(
  calendar: Calendar,
  props: Pick<
    CalendarListProps,
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

function renderGroupSection(
  group: CalendarGroup,
  props: CalendarListProps,
) {
  const itemProps = {
    visibleIds: props.visibleIds,
    onToggle: props.onToggle,
    onEdit: props.onEdit,
    onDelete: props.onDelete,
    compact: props.compact,
    showDelete: props.showDelete,
    showSharedBadge: props.showSharedBadge,
    onSharedClick: props.onSharedClick,
  };

  if (isLinkedAccountGroup(group)) {
    const childIds = group.calendars.map((c) => c.id);
    const { allVisible } = getVisibilityHeaderState(props.visibleIds, childIds);

    return (
      <LinkedAccountCalendarGroup
        key={group.connectionId}
        accountEmail={group.accountEmail!}
        connectionId={
          group.provider === "google" ? group.connectionId : undefined
        }
        syncStatus={group.lastSyncStatus}
        syncError={group.lastSyncError}
        headerChecked={allVisible}
        onHeaderToggle={(checked) =>
          props.onToggleGroup?.(childIds, checked) ??
          childIds.forEach((id) => props.onToggle(id, checked))
        }
        onManageCalendars={
          group.provider === "google" && props.onManageCalendars
            ? () => props.onManageCalendars!(group.connectionId!)
            : undefined
        }
        onEditHeader={
          group.label === "LINKED_GOOGLE" &&
          props.onEditConnectionLabel &&
          group.connectionId &&
          group.providerAccountEmail
            ? () =>
                props.onEditConnectionLabel!(
                  group.connectionId!,
                  group.providerAccountEmail!,
                  group.accountDisplayName ?? null,
                )
            : undefined
        }
        compact={props.compact}
      >
        {group.calendars.map((calendar) => renderCalendarItem(calendar, itemProps))}
      </LinkedAccountCalendarGroup>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {group.calendars.map((calendar) => renderCalendarItem(calendar, itemProps))}
    </div>
  );
}

export function CalendarList({
  groups,
  visibleIds,
  onToggle,
  onToggleGroup,
  onEdit,
  onDelete,
  onManageCalendars,
  onEditConnectionLabel,
  compact = false,
  showDelete = false,
  hideGroupHeaders = false,
  showSharedBadge = false,
  onSharedClick,
}: CalendarListProps) {
  const listProps: CalendarListProps = {
    groups,
    visibleIds,
    onToggle,
    onToggleGroup,
    onEdit,
    onDelete,
    onManageCalendars,
    onEditConnectionLabel,
    compact,
    showDelete,
    hideGroupHeaders,
    showSharedBadge,
    onSharedClick,
  };

  const visibleGroups = groups.filter(
    (group) => group.calendars.length > 0 || group.disabled,
  );

  return (
    <div className="flex flex-col gap-2">
      {visibleGroups.map((group) => (
        <section
          key={
            group.connectionId ??
            group.label + (group.disabled ? "-stub" : "") + group.title
          }
          className={cn(group.disabled && "opacity-50")}
        >
          {!isLinkedAccountGroup(group) ? (
            <h3
              className={cn(
                "mb-2 px-1 text-xs font-bold uppercase tracking-widest text-text-secondary",
                hideGroupHeaders && "sr-only",
              )}
            >
              {group.title}
              {group.disabled && group.emptyMessage ? (
                <span className="ml-2 text-[10px] font-normal normal-case text-accent">
                  {group.emptyMessage}
                </span>
              ) : null}
            </h3>
          ) : hideGroupHeaders ? (
            <h3 className="sr-only">{group.title}</h3>
          ) : null}

          {group.disabled ? null : renderGroupSection(group, listProps)}
        </section>
      ))}
    </div>
  );
}
