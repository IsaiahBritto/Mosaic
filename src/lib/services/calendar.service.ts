import type { SupabaseClient } from "@supabase/supabase-js";
import {
  countOwnedCalendars,
  deleteCalendarById,
  fetchCalendarById,
  fetchCalendarsForUser,
  fetchVisibleCalendarIds,
  insertCalendar,
  updateCalendarById,
  updateVisibleCalendarIds,
} from "@/lib/repositories/calendars.repository";
import {
  clearMemberDisplayOverrides,
  updateMemberDisplayOverrides,
} from "@/lib/repositories/members.repository";
import { AppError } from "@/lib/errors";
import type { Calendar, CalendarGroup, SidebarItem } from "@/types/calendar";
import {
  buildSidebarItems,
  mergeSidebarOrder,
  type SidebarCalendarOrder,
} from "@/lib/calendar/sidebar-order";
import {
  fetchSidebarCalendarOrder,
  updateSidebarCalendarOrder,
} from "@/lib/repositories/calendars.repository";
import { features } from "@/lib/config/features";
import { requireCalendarRole } from "@/lib/services/permissions.service";
import { fetchConnectionsForUser } from "@/lib/integrations/sync.service";
import type { CalendarConnection } from "@/lib/integrations/types";

function getConnectionHeaderLabel(connection: CalendarConnection): string {
  if (connection.provider === "google") {
    return connection.displayName?.trim() || connection.providerAccountEmail;
  }
  return connection.providerAccountEmail;
}

/** Group calendars for NATIVE / linked accounts / SHARED sections in the UI. */
export function groupCalendars(
  calendars: Calendar[],
  connections: CalendarConnection[] = [],
): CalendarGroup[] {
  const native = calendars.filter(
    (c) =>
      c.source === "native" &&
      c.type === "native" &&
      c.role === "owner",
  );

  const shared = calendars.filter(
    (c) =>
      c.source === "native" &&
      (c.type === "shared" || c.role !== "owner"),
  );

  const linkedGroups: CalendarGroup[] = [];

  for (const connection of connections) {
    if (connection.provider !== "google" && connection.provider !== "apple") {
      continue;
    }

    const linkedCalendars = calendars.filter(
      (c) => c.source === connection.provider && c.connectionId === connection.id,
    );

    if (linkedCalendars.length === 0) {
      continue;
    }

    const headerLabel = getConnectionHeaderLabel(connection);

    linkedGroups.push({
      label: connection.provider === "google" ? "LINKED_GOOGLE" : "LINKED_APPLE",
      title: headerLabel,
      calendars: linkedCalendars,
      connectionId: connection.id,
      accountEmail: headerLabel,
      providerAccountEmail: connection.providerAccountEmail,
      accountDisplayName:
        connection.provider === "google" ? connection.displayName : undefined,
      provider: connection.provider,
      lastSyncStatus: connection.lastSyncStatus,
      lastSyncError: connection.lastSyncError,
    });
  }

  const unmatchedLinked = calendars.filter(
    (c) =>
      (c.source === "google" || c.source === "apple") &&
      (c.connectionId == null ||
        !connections.some((conn) => conn.id === c.connectionId)),
  );

  if (unmatchedLinked.length > 0) {
    linkedGroups.push({
      label: "LINKED",
      title: "Linked",
      calendars: unmatchedLinked,
    });
  }

  const candidates: CalendarGroup[] = [
    { label: "NATIVE", title: "Native", calendars: native },
    ...linkedGroups,
    { label: "SHARED", title: "Shared", calendars: shared },
  ];

  const groups = candidates.filter((group) => group.calendars.length > 0);

  if (features.showLinkedCalendarStubs) {
    groups.push({
      label: "LINKED",
      title: "Linked",
      calendars: [],
      disabled: true,
      emptyMessage: "Coming soon",
    });
  }

  return groups;
}

/** Flatten grouped calendars in display order (Native → Linked → Shared). */
export function orderCalendarsForDisplay(groups: CalendarGroup[]): Calendar[] {
  return groups.filter((group) => !group.disabled).flatMap((group) => group.calendars);
}

/** Resolve visible calendar IDs; empty array means none visible. */
export function resolveVisibleIds(
  calendars: Calendar[],
  storedVisibleIds: string[],
): string[] {
  return storedVisibleIds.filter((id) => calendars.some((c) => c.id === id));
}

export function applyVisibilityToCalendars(
  calendars: Calendar[],
  visibleIds: string[],
): Calendar[] {
  return calendars.map((calendar) => ({
    ...calendar,
    isVisible: visibleIds.includes(calendar.id),
  }));
}

export type CalendarsPageData = {
  calendars: Calendar[];
  groups: CalendarGroup[];
  sidebarItems: SidebarItem[];
  sidebarOrder: SidebarCalendarOrder;
  visibleIds: string[];
  connections: CalendarConnection[];
};

export async function getCalendarsPageData(
  supabase: SupabaseClient,
  userId: string,
): Promise<CalendarsPageData> {
  const storedVisibleIds = await fetchVisibleCalendarIds(supabase, userId);
  const calendars = await fetchCalendarsForUser(supabase, userId);
  const visibleIds = resolveVisibleIds(calendars, storedVisibleIds);
  const withVisibility = applyVisibilityToCalendars(calendars, visibleIds);

  let connections: CalendarConnection[] = [];
  try {
    connections = await fetchConnectionsForUser(supabase, userId);
  } catch {
    connections = [];
  }

  const groups = groupCalendars(withVisibility, connections);
  const rawOrder = await fetchSidebarCalendarOrder(supabase, userId);
  const parsedOrder =
    rawOrder != null && Array.isArray(rawOrder.items)
      ? (rawOrder as SidebarCalendarOrder)
      : null;
  const sidebarOrder = mergeSidebarOrder(withVisibility, connections, parsedOrder);
  const sidebarItems = buildSidebarItems(
    withVisibility,
    connections,
    sidebarOrder,
  );

  return {
    calendars: withVisibility,
    groups,
    sidebarItems,
    sidebarOrder,
    visibleIds,
    connections,
  };
}

export async function saveSidebarOrderForUser(
  supabase: SupabaseClient,
  userId: string,
  order: SidebarCalendarOrder,
): Promise<SidebarCalendarOrder> {
  const calendars = await fetchCalendarsForUser(supabase, userId);
  let connections: CalendarConnection[] = [];
  try {
    connections = await fetchConnectionsForUser(supabase, userId);
  } catch {
    connections = [];
  }

  const merged = mergeSidebarOrder(calendars, connections, order);
  await updateSidebarCalendarOrder(
    supabase,
    userId,
    merged as unknown as Record<string, unknown>,
  );
  return merged;
}

export async function createCalendarForUser(
  supabase: SupabaseClient,
  userId: string,
  name: string,
  colorHex: string,
): Promise<Calendar> {
  const row = await insertCalendar(supabase, userId, name, colorHex);

  return {
    id: row.id,
    name: row.name,
    colorHex: row.color_hex,
    type: row.type,
    source: "native",
    ownerId: row.owner_id,
    isVisible: true,
    role: "owner",
  };
}

export async function updateCalendarForUser(
  supabase: SupabaseClient,
  userId: string,
  calendarId: string,
  updates: { name?: string; colorHex?: string },
): Promise<void> {
  const calendar = await fetchCalendarById(supabase, calendarId);
  if (!calendar || calendar.owner_id !== userId) {
    throw new AppError("FORBIDDEN", "You cannot edit this calendar", 403);
  }
  await updateCalendarById(supabase, calendarId, updates);
}

export async function updateCalendarDisplayForUser(
  supabase: SupabaseClient,
  userId: string,
  calendarId: string,
  updates: {
    name?: string;
    colorHex?: string;
    scope: "global" | "personal";
  },
): Promise<void> {
  const calendar = await fetchCalendarById(supabase, calendarId);
  if (!calendar) {
    throw new AppError("NOT_FOUND", "Calendar not found", 404);
  }

  if (updates.scope === "personal") {
    await requireCalendarRole(supabase, userId, calendarId, "viewer");
    await updateMemberDisplayOverrides(supabase, userId, calendarId, {
      name: updates.name,
      colorHex: updates.colorHex,
    });
    return;
  }

  if (calendar.owner_id === userId) {
    await updateCalendarById(supabase, calendarId, {
      name: updates.name,
      colorHex: updates.colorHex,
    });
    return;
  }

  await requireCalendarRole(supabase, userId, calendarId, "editor");
  await updateCalendarById(supabase, calendarId, {
    name: updates.name,
    colorHex: updates.colorHex,
  });
}

export async function revertCalendarDisplayForUser(
  supabase: SupabaseClient,
  userId: string,
  calendarId: string,
): Promise<void> {
  await requireCalendarRole(supabase, userId, calendarId, "viewer");
  await clearMemberDisplayOverrides(supabase, userId, calendarId);
}

export async function deleteCalendarForUser(
  supabase: SupabaseClient,
  userId: string,
  calendarId: string,
): Promise<void> {
  const calendar = await fetchCalendarById(supabase, calendarId);
  if (!calendar || calendar.owner_id !== userId) {
    throw new AppError("FORBIDDEN", "You cannot delete this calendar", 403);
  }

  if (calendar.source !== "native") {
    throw new AppError(
      "FORBIDDEN",
      "Linked calendars are removed when you disconnect the account",
      403,
    );
  }

  const ownedCount = await countOwnedCalendars(supabase, userId);
  if (ownedCount <= 1) {
    throw new AppError(
      "VALIDATION_ERROR",
      "You must keep at least one calendar",
      400,
    );
  }

  await deleteCalendarById(supabase, calendarId, userId);
}

export async function saveVisibleCalendarIds(
  supabase: SupabaseClient,
  userId: string,
  visibleIds: string[],
  allCalendarIds: string[],
): Promise<void> {
  const validIds = visibleIds.filter((id) => allCalendarIds.includes(id));
  await updateVisibleCalendarIds(supabase, userId, validIds);
}

export async function setSingleCalendarVisibility(
  supabase: SupabaseClient,
  userId: string,
  calendarId: string,
  visible: boolean,
): Promise<void> {
  const calendars = await fetchCalendarsForUser(supabase, userId);
  const storedVisibleIds = await fetchVisibleCalendarIds(supabase, userId);
  let visibleIds = resolveVisibleIds(calendars, storedVisibleIds);

  if (visible) {
    if (!visibleIds.includes(calendarId)) {
      visibleIds = [...visibleIds, calendarId];
    }
  } else {
    visibleIds = visibleIds.filter((id) => id !== calendarId);
  }

  await updateVisibleCalendarIds(supabase, userId, visibleIds);
}

export async function setAllCalendarsVisibility(
  supabase: SupabaseClient,
  userId: string,
  visible: boolean,
): Promise<void> {
  const calendars = await fetchCalendarsForUser(supabase, userId);
  const visibleIds = visible ? calendars.map((c) => c.id) : [];
  await updateVisibleCalendarIds(supabase, userId, visibleIds);
}

export async function getVisibleCalendarIdsForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<string[]> {
  const calendars = await fetchCalendarsForUser(supabase, userId);
  const storedVisibleIds = await fetchVisibleCalendarIds(supabase, userId);
  return resolveVisibleIds(calendars, storedVisibleIds);
}
