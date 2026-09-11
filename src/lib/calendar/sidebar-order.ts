import type { CalendarConnection } from "@/lib/integrations/types";
import type {
  Calendar,
  CalendarGroup,
  SidebarConnectionItem,
  SidebarItem,
} from "@/types/calendar";

export type SidebarOrderCalendarNode = {
  type: "calendar";
  calendarId: string;
};

export type SidebarOrderConnectionNode = {
  type: "connection";
  connectionId: string;
  calendarIds: string[];
};

export type SidebarOrderNode =
  | SidebarOrderCalendarNode
  | SidebarOrderConnectionNode;

export type SidebarCalendarOrder = {
  items: SidebarOrderNode[];
};

function isStandaloneCalendar(calendar: Calendar): boolean {
  if (calendar.source === "native") {
    return true;
  }
  return calendar.connectionId == null;
}

function getConnectionHeaderLabel(connection: CalendarConnection): string {
  if (connection.provider === "google") {
    return connection.displayName?.trim() || connection.providerAccountEmail;
  }
  return connection.providerAccountEmail;
}

export function groupsToDefaultSidebarOrder(
  groups: CalendarGroup[],
): SidebarCalendarOrder {
  const items: SidebarOrderNode[] = [];

  for (const group of groups) {
    if (group.disabled) {
      continue;
    }

    if (
      (group.label === "LINKED_GOOGLE" || group.label === "LINKED_APPLE") &&
      group.connectionId
    ) {
      items.push({
        type: "connection",
        connectionId: group.connectionId,
        calendarIds: group.calendars.map((calendar) => calendar.id),
      });
      continue;
    }

    for (const calendar of group.calendars) {
      items.push({ type: "calendar", calendarId: calendar.id });
    }
  }

  return { items };
}

function buildDefaultOrderNodes(
  calendars: Calendar[],
  connections: CalendarConnection[],
): SidebarOrderNode[] {
  const native = calendars.filter(
    (calendar) =>
      calendar.source === "native" &&
      calendar.type === "native" &&
      calendar.role === "owner",
  );

  const shared = calendars.filter(
    (calendar) =>
      calendar.source === "native" &&
      (calendar.type === "shared" || calendar.role !== "owner"),
  );

  const items: SidebarOrderNode[] = [];

  for (const calendar of native) {
    items.push({ type: "calendar", calendarId: calendar.id });
  }

  for (const connection of connections) {
    if (connection.provider !== "google" && connection.provider !== "apple") {
      continue;
    }

    const linkedCalendars = calendars.filter(
      (calendar) =>
        calendar.source === connection.provider &&
        calendar.connectionId === connection.id,
    );

    if (linkedCalendars.length === 0) {
      continue;
    }

    items.push({
      type: "connection",
      connectionId: connection.id,
      calendarIds: linkedCalendars.map((calendar) => calendar.id),
    });
  }

  const unmatchedLinked = calendars.filter(
    (calendar) =>
      (calendar.source === "google" || calendar.source === "apple") &&
      (calendar.connectionId == null ||
        !connections.some((connection) => connection.id === calendar.connectionId)),
  );

  for (const calendar of unmatchedLinked) {
    items.push({ type: "calendar", calendarId: calendar.id });
  }

  for (const calendar of shared) {
    items.push({ type: "calendar", calendarId: calendar.id });
  }

  return items;
}

export function buildDefaultSidebarOrder(
  calendars: Calendar[],
  connections: CalendarConnection[],
): SidebarCalendarOrder {
  return { items: buildDefaultOrderNodes(calendars, connections) };
}

function orderNodesFromConnectionGroup(
  connectionId: string,
  calendars: Calendar[],
  savedChildIds: string[] | undefined,
): SidebarOrderConnectionNode {
  const groupCalendarsList = calendars.filter(
    (calendar) => calendar.connectionId === connectionId,
  );
  const validIds = new Set(groupCalendarsList.map((calendar) => calendar.id));
  const orderedIds: string[] = [];

  for (const calendarId of savedChildIds ?? []) {
    if (validIds.has(calendarId) && !orderedIds.includes(calendarId)) {
      orderedIds.push(calendarId);
    }
  }

  for (const calendar of groupCalendarsList) {
    if (!orderedIds.includes(calendar.id)) {
      orderedIds.push(calendar.id);
    }
  }

  return {
    type: "connection",
    connectionId,
    calendarIds: orderedIds,
  };
}

export function mergeSidebarOrder(
  calendars: Calendar[],
  connections: CalendarConnection[],
  savedOrder: SidebarCalendarOrder | null | undefined,
): SidebarCalendarOrder {
  const calendarById = new Map(calendars.map((calendar) => [calendar.id, calendar]));
  const connectionById = new Map(
    connections.map((connection) => [connection.id, connection]),
  );

  const standaloneIds = new Set(
    calendars.filter(isStandaloneCalendar).map((calendar) => calendar.id),
  );

  const connectionIdsWithCalendars = new Set(
    connections
      .filter((connection) =>
        calendars.some((calendar) => calendar.connectionId === connection.id),
      )
      .map((connection) => connection.id),
  );

  const defaultOrder: SidebarCalendarOrder = {
    items: buildDefaultOrderNodes(calendars, connections),
  };
  const savedItems = savedOrder?.items ?? [];

  if (savedItems.length === 0) {
    return defaultOrder;
  }

  const mergedItems: SidebarOrderNode[] = [];
  const seenStandalone = new Set<string>();
  const seenConnections = new Set<string>();

  for (const item of savedItems) {
    if (item.type === "calendar") {
      if (!standaloneIds.has(item.calendarId) || !calendarById.has(item.calendarId)) {
        continue;
      }
      if (seenStandalone.has(item.calendarId)) {
        continue;
      }
      seenStandalone.add(item.calendarId);
      mergedItems.push({ type: "calendar", calendarId: item.calendarId });
      continue;
    }

    if (!connectionIdsWithCalendars.has(item.connectionId)) {
      continue;
    }
    if (seenConnections.has(item.connectionId)) {
      continue;
    }
    seenConnections.add(item.connectionId);
    mergedItems.push(
      orderNodesFromConnectionGroup(
        item.connectionId,
        calendars,
        item.calendarIds,
      ),
    );
  }

  for (const item of defaultOrder.items) {
    if (item.type === "calendar") {
      if (seenStandalone.has(item.calendarId)) {
        continue;
      }
      mergedItems.push(item);
      seenStandalone.add(item.calendarId);
      continue;
    }

    if (seenConnections.has(item.connectionId)) {
      continue;
    }
    mergedItems.push(item);
    seenConnections.add(item.connectionId);
  }

  return { items: mergedItems };
}

function buildConnectionSidebarItem(
  connection: CalendarConnection,
  calendars: Calendar[],
  calendarIds: string[],
): SidebarConnectionItem | null {
  const calendarById = new Map(calendars.map((calendar) => [calendar.id, calendar]));
  const orderedCalendars = calendarIds
    .map((calendarId) => calendarById.get(calendarId))
    .filter((calendar): calendar is Calendar => calendar != null);

  if (orderedCalendars.length === 0) {
    return null;
  }

  return {
    kind: "connection",
    connectionId: connection.id,
    title: getConnectionHeaderLabel(connection),
    provider: connection.provider as "google" | "apple",
    providerAccountEmail: connection.providerAccountEmail,
    accountDisplayName:
      connection.provider === "google" ? connection.displayName : undefined,
    lastSyncStatus: connection.lastSyncStatus,
    lastSyncError: connection.lastSyncError,
    calendars: orderedCalendars,
  };
}

export function buildSidebarItems(
  calendars: Calendar[],
  connections: CalendarConnection[],
  savedOrder: SidebarCalendarOrder | null | undefined,
): SidebarItem[] {
  const order = mergeSidebarOrder(calendars, connections, savedOrder);
  const calendarById = new Map(calendars.map((calendar) => [calendar.id, calendar]));
  const connectionById = new Map(
    connections.map((connection) => [connection.id, connection]),
  );
  const items: SidebarItem[] = [];

  for (const node of order.items) {
    if (node.type === "calendar") {
      const calendar = calendarById.get(node.calendarId);
      if (!calendar) {
        continue;
      }
      items.push({ kind: "calendar", calendar });
      continue;
    }

    const connection = connectionById.get(node.connectionId);
    if (!connection) {
      continue;
    }

    const connectionItem = buildConnectionSidebarItem(
      connection,
      calendars,
      node.calendarIds,
    );
    if (connectionItem) {
      items.push(connectionItem);
    }
  }

  return items;
}

export function sidebarItemsToOrder(items: SidebarItem[]): SidebarCalendarOrder {
  return {
    items: items.map((item) => {
      if (item.kind === "calendar") {
        return { type: "calendar", calendarId: item.calendar.id };
      }
      return {
        type: "connection",
        connectionId: item.connectionId,
        calendarIds: item.calendars.map((calendar) => calendar.id),
      };
    }),
  };
}

export function sidebarOrderToSortableIds(order: SidebarCalendarOrder): string[] {
  return order.items.map((item) =>
    item.type === "calendar" ? `calendar:${item.calendarId}` : `connection:${item.connectionId}`,
  );
}

export function reorderSidebarOrderItems(
  order: SidebarCalendarOrder,
  activeId: string,
  overId: string,
): SidebarCalendarOrder {
  const ids = sidebarOrderToSortableIds(order);
  const oldIndex = ids.indexOf(activeId);
  const newIndex = ids.indexOf(overId);
  if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) {
    return order;
  }

  const nextItems = [...order.items];
  const [moved] = nextItems.splice(oldIndex, 1);
  nextItems.splice(newIndex, 0, moved!);
  return { items: nextItems };
}

export function reorderConnectionChildIds(
  order: SidebarCalendarOrder,
  connectionId: string,
  activeCalendarId: string,
  overCalendarId: string,
): SidebarCalendarOrder {
  return {
    items: order.items.map((item) => {
      if (item.type !== "connection" || item.connectionId !== connectionId) {
        return item;
      }

      const ids = [...item.calendarIds];
      const oldIndex = ids.indexOf(activeCalendarId);
      const newIndex = ids.indexOf(overCalendarId);
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) {
        return item;
      }

      const [moved] = ids.splice(oldIndex, 1);
      ids.splice(newIndex, 0, moved!);
      return { ...item, calendarIds: ids };
    }),
  };
}
