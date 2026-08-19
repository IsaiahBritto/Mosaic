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
import { AppError } from "@/lib/errors";
import type { Calendar, CalendarGroup } from "@/types/calendar";
import { features } from "@/lib/config/features";
import { inviteToCalendarForUser } from "@/lib/services/sharing.service";

/** Group calendars for NATIVE / SHARED / LINKED sections in the UI. */
export function groupCalendars(calendars: Calendar[]): CalendarGroup[] {
  const native = calendars.filter(
    (c) => c.type === "native" && c.role === "owner",
  );

  const shared = calendars.filter(
    (c) => c.type === "shared" || c.role !== "owner",
  );

  const groups: CalendarGroup[] = [
    {
      label: "NATIVE",
      title: "Native",
      calendars: native,
    },
    {
      label: "SHARED",
      title: "Shared",
      calendars: shared,
      emptyMessage:
        shared.length === 0 ? "No shared calendars yet" : undefined,
    },
  ];

  if (features.linkedGoogleCalendars) {
    groups.push({
      label: "LINKED",
      title: "Linked: Google",
      calendars: [],
      emptyMessage: "Connect Google in Calendars settings",
    });
  }

  if (features.linkedAppleCalendars) {
    groups.push({
      label: "LINKED",
      title: "Linked: i-Cloud",
      calendars: [],
      emptyMessage: "Connect iCloud in Calendars settings",
    });
  }

  if (features.showLinkedCalendarStubs) {
    groups.push({
      label: "LINKED",
      title: "Linked: i-Cloud",
      calendars: [],
      disabled: true,
      emptyMessage: "Coming soon",
    });
  }

  return groups;
}

/** Resolve visible calendar IDs; empty preference means all calendars visible. */
export function resolveVisibleIds(
  calendars: Calendar[],
  storedVisibleIds: string[],
): string[] {
  if (storedVisibleIds.length === 0) {
    return calendars.map((c) => c.id);
  }
  return storedVisibleIds.filter((id) => calendars.some((c) => c.id === id));
}

export function applyVisibilityToCalendars(
  calendars: Calendar[],
  visibleIds: string[],
): Calendar[] {
  const effectiveVisible =
    visibleIds.length === 0 ? calendars.map((c) => c.id) : visibleIds;

  return calendars.map((calendar) => ({
    ...calendar,
    isVisible: effectiveVisible.includes(calendar.id),
  }));
}

export type CalendarsPageData = {
  calendars: Calendar[];
  groups: CalendarGroup[];
  visibleIds: string[];
};

export async function getCalendarsPageData(
  supabase: SupabaseClient,
  userId: string,
): Promise<CalendarsPageData> {
  const storedVisibleIds = await fetchVisibleCalendarIds(supabase, userId);
  const calendars = await fetchCalendarsForUser(supabase, userId);
  const visibleIds = resolveVisibleIds(calendars, storedVisibleIds);
  const withVisibility = applyVisibilityToCalendars(calendars, visibleIds);

  return {
    calendars: withVisibility,
    groups: groupCalendars(withVisibility),
    visibleIds,
  };
}

export async function createCalendarForUser(
  supabase: SupabaseClient,
  userId: string,
  name: string,
  colorHex: string,
  inviteEmail?: string,
): Promise<Calendar> {
  const row = await insertCalendar(supabase, userId, name, colorHex);

  if (inviteEmail?.trim()) {
    await inviteToCalendarForUser(
      supabase,
      userId,
      row.id,
      inviteEmail.trim(),
      "editor",
    );
  }

  return {
    id: row.id,
    name: row.name,
    colorHex: row.color_hex,
    type: row.type,
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

export async function deleteCalendarForUser(
  supabase: SupabaseClient,
  userId: string,
  calendarId: string,
): Promise<void> {
  const calendar = await fetchCalendarById(supabase, calendarId);
  if (!calendar || calendar.owner_id !== userId) {
    throw new AppError("FORBIDDEN", "You cannot delete this calendar", 403);
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
