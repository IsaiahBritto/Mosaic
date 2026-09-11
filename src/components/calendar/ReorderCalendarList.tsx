"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { SidebarItem } from "@/types/calendar";
import {
  reorderConnectionChildIds,
  reorderSidebarOrderItems,
  sidebarItemsToOrder,
  sidebarOrderToSortableIds,
  type SidebarCalendarOrder,
} from "@/lib/calendar/sidebar-order";
import { cn } from "@/lib/utils/cn";

type ReorderCalendarListProps = {
  items: SidebarItem[];
  order: SidebarCalendarOrder;
  onOrderChange: (order: SidebarCalendarOrder) => void;
};

function DragHandle({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 cursor-grab touch-none flex-col gap-0.5 px-1 text-text-secondary active:cursor-grabbing",
        className,
      )}
      aria-hidden
    >
      <span className="block h-0.5 w-3 rounded-full bg-current" />
      <span className="block h-0.5 w-3 rounded-full bg-current" />
      <span className="block h-0.5 w-3 rounded-full bg-current" />
    </span>
  );
}

function SortableCalendarRow({
  id,
  label,
  nested = false,
}: {
  id: string;
  label: string;
  nested?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        "flex items-center gap-3 rounded-lg bg-background py-1.5",
        nested && "pl-4",
        isDragging && "opacity-50",
      )}
    >
      <button
        type="button"
        className="touch-none"
        {...attributes}
        {...listeners}
        aria-label={`Reorder ${label}`}
      >
        <DragHandle />
      </button>
      <span className="truncate text-sm text-text-primary">{label}</span>
    </div>
  );
}

function SortableConnectionGroup({
  item,
  order,
  onOrderChange,
}: {
  item: Extract<SidebarItem, { kind: "connection" }>;
  order: SidebarCalendarOrder;
  onOrderChange: (order: SidebarCalendarOrder) => void;
}) {
  const groupId = `connection:${item.connectionId}`;
  const childIds = item.calendars.map((calendar) => `calendar:${calendar.id}`);

  function handleChildDragEnd(activeId: string, overId: string) {
    const activeCalendarId = activeId.replace("calendar:", "");
    const overCalendarId = overId.replace("calendar:", "");
    onOrderChange(
      reorderConnectionChildIds(
        order,
        item.connectionId,
        activeCalendarId,
        overCalendarId,
      ),
    );
  }

  return (
    <div className="flex flex-col gap-1 rounded-lg bg-surface/20 p-1">
      <SortableCalendarRow id={groupId} label={item.title} />
      <SortableContext items={childIds} strategy={verticalListSortingStrategy}>
        <NestedChildList
          calendars={item.calendars}
          onChildDragEnd={handleChildDragEnd}
        />
      </SortableContext>
    </div>
  );
}

function NestedChildList({
  calendars,
  onChildDragEnd,
}: {
  calendars: Extract<SidebarItem, { kind: "connection" }>["calendars"];
  onChildDragEnd: (activeId: string, overId: string) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={(event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) {
          return;
        }
        onChildDragEnd(String(active.id), String(over.id));
      }}
    >
      <div className="flex flex-col gap-1">
        {calendars.map((calendar) => (
          <SortableCalendarRow
            key={calendar.id}
            id={`calendar:${calendar.id}`}
            label={calendar.name}
            nested
          />
        ))}
      </div>
    </DndContext>
  );
}

export function ReorderCalendarList({
  items,
  order,
  onOrderChange,
}: ReorderCalendarListProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const topLevelIds = useMemo(
    () => sidebarOrderToSortableIds(order),
    [order],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function updateOrder(next: SidebarCalendarOrder) {
    onOrderChange(next);
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (!over || active.id === over.id) {
      return;
    }

    updateOrder(
      reorderSidebarOrderItems(order, String(active.id), String(over.id)),
    );
  }

  const activeItem = activeId
    ? items.find((item) => {
        if (item.kind === "calendar") {
          return `calendar:${item.calendar.id}` === activeId;
        }
        return `connection:${item.connectionId}` === activeId;
      })
    : null;

  const activeLabel =
    activeItem == null
      ? null
      : activeItem.kind === "calendar"
        ? activeItem.calendar.name
        : activeItem.title;

  const orderedItems = useMemo(() => {
    const itemByKey = new Map<string, SidebarItem>();
    for (const item of items) {
      if (item.kind === "calendar") {
        itemByKey.set(`calendar:${item.calendar.id}`, item);
      } else {
        itemByKey.set(`connection:${item.connectionId}`, item);
      }
    }

    return order.items
      .map((node) => {
        const key =
          node.type === "calendar"
            ? `calendar:${node.calendarId}`
            : `connection:${node.connectionId}`;
        const found = itemByKey.get(key);
        if (!found) {
          return null;
        }
        if (found.kind === "connection" && node.type === "connection") {
          const calendarById = new Map(
            found.calendars.map((calendar) => [calendar.id, calendar]),
          );
          return {
            ...found,
            calendars: node.calendarIds
              .map((calendarId) => calendarById.get(calendarId))
              .filter((calendar): calendar is NonNullable<typeof calendar> =>
                calendar != null,
              ),
          };
        }
        return found;
      })
      .filter((item): item is SidebarItem => item != null);
  }, [items, order]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={topLevelIds} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2">
          {orderedItems.map((item) =>
            item.kind === "calendar" ? (
              <SortableCalendarRow
                key={`calendar:${item.calendar.id}`}
                id={`calendar:${item.calendar.id}`}
                label={item.calendar.name}
              />
            ) : (
              <SortableConnectionGroup
                key={`connection:${item.connectionId}`}
                item={item}
                order={order}
                onOrderChange={updateOrder}
              />
            ),
          )}
        </div>
      </SortableContext>

      <DragOverlay>
        {activeLabel ? (
          <div className="flex items-center gap-3 rounded-lg bg-surface px-3 py-2 shadow-lg">
            <DragHandle />
            <span className="text-sm text-text-primary">{activeLabel}</span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

export function orderFromSidebarItems(items: SidebarItem[]): SidebarCalendarOrder {
  return sidebarItemsToOrder(items);
}
