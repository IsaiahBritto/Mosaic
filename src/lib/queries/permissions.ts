import type { SupabaseClient } from "@supabase/supabase-js";
import type { CalendarRole } from "@/types/calendar";
import {
  fetchEventById,
  fetchEventCalendarRole,
} from "@/lib/repositories/events.repository";

const ROLE_RANK: Record<CalendarRole, number> = {
  viewer: 1,
  editor: 2,
  owner: 3,
};

function hasMinRole(role: CalendarRole, minRole: CalendarRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minRole];
}

export async function canWriteCalendar(
  supabase: SupabaseClient,
  userId: string,
  calendarId: string,
): Promise<boolean> {
  const role = await fetchEventCalendarRole(supabase, userId, calendarId);
  return role !== null && hasMinRole(role, "editor");
}

export async function canReadEvent(
  supabase: SupabaseClient,
  userId: string,
  eventId: string,
): Promise<boolean> {
  const event = await fetchEventById(supabase, eventId);
  if (!event) {
    return false;
  }

  const role = await fetchEventCalendarRole(supabase, userId, event.calendarId);
  return role !== null;
}

export async function getCalendarRole(
  supabase: SupabaseClient,
  userId: string,
  calendarId: string,
): Promise<CalendarRole | null> {
  return fetchEventCalendarRole(supabase, userId, calendarId);
}
