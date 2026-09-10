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
import type { Calendar, CalendarGroup } from "@/types/calendar";
import { features } from "@/lib/config/features";
import { requireCalendarRole } from "@/lib/services/permissions.service";
import { inviteToCalendarForUser } from "@/lib/services/sharing.service";

/** Group calendars for NATIVE / LINKED / SHARED sections in the UI. */
export function groupCalendars(calendars: Calendar[]): CalendarGroup[] {
  const native = calendars.filter(
    (c) =>
      c.source === "native" &&
      c.type === "native" &&
      c.role === "owner",
  );

  const linked = calendars.filter(
    (c) => c.source === "google" || c.source === "apple",
  );

  const shared = calendars.filter(
    (c) =>
      c.source === "native" &&
      (c.type === "shared" || c.role !== "owner"),
  );

  const candidates: CalendarGroup[] = [
    { label: "NATIVE", title: "Native", calendars: native },
    { label: "LINKED", title: "Linked", calendars: linked },
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
