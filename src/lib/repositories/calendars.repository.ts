import type { SupabaseClient } from "@supabase/supabase-js";
import type { Calendar, CalendarRole, CalendarRow, CalendarType } from "@/types/calendar";

type CalendarMemberJoin = {
  role: CalendarRole;
  invite_status: string;
  calendars: {
    id: string;
    owner_id: string;
    name: string;
    color_hex: string;
    type: CalendarType;
    is_visible_default: boolean;
    created_at: string;
  };
};

export function mapCalendarRow(
  row: CalendarMemberJoin["calendars"],
  role: CalendarRole,
  visibleIds: string[],
): Calendar {
  const isVisible =
    visibleIds.length === 0
      ? true
      : visibleIds.includes(row.id);

  return {
    id: row.id,
    name: row.name,
    colorHex: row.color_hex,
    type: row.type,
    ownerId: row.owner_id,
    isVisible,
    role,
  };
}

export async function fetchCalendarsForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<Calendar[]> {
  const visibleIds = await fetchVisibleCalendarIds(supabase, userId);

  const { data, error } = await supabase
    .from("calendar_members")
    .select(
      `
      role,
      invite_status,
      calendars (
        id,
        owner_id,
        name,
        color_hex,
        type,
        is_visible_default,
        created_at
      )
    `,
    )
    .eq("user_id", userId)
    .eq("invite_status", "accepted");

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as unknown as CalendarMemberJoin[];

  return rows
    .filter((row) => row.calendars != null)
    .map((row) =>
      mapCalendarRow(row.calendars, row.role, visibleIds),
    );
}

export async function fetchVisibleCalendarIds(
  supabase: SupabaseClient,
  userId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("user_preferences")
    .select("visible_calendar_ids")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data?.visible_calendar_ids as string[] | undefined) ?? [];
}

export async function updateVisibleCalendarIds(
  supabase: SupabaseClient,
  userId: string,
  visibleIds: string[],
): Promise<void> {
  const { error } = await supabase
    .from("user_preferences")
    .update({ visible_calendar_ids: visibleIds, updated_at: new Date().toISOString() })
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function countOwnedCalendars(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("calendars")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", userId)
    .eq("type", "native");

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

export async function insertCalendar(
  supabase: SupabaseClient,
  userId: string,
  name: string,
  colorHex: string,
): Promise<CalendarRow> {
  const { data: calendar, error: calendarError } = await supabase
    .from("calendars")
    .insert({
      owner_id: userId,
      name,
      color_hex: colorHex,
      type: "native",
      is_visible_default: true,
    })
    .select("id, owner_id, name, color_hex, type, is_visible_default, created_at")
    .single();

  if (calendarError || !calendar) {
    throw new Error(calendarError?.message ?? "Failed to create calendar");
  }

  const { error: memberError } = await supabase.from("calendar_members").insert({
    calendar_id: calendar.id,
    user_id: userId,
    role: "owner",
    invite_status: "accepted",
  });

  if (memberError) {
    throw new Error(memberError.message);
  }

  const visibleIds = await fetchVisibleCalendarIds(supabase, userId);
  await updateVisibleCalendarIds(supabase, userId, [...visibleIds, calendar.id]);

  return { ...calendar, role: "owner" };
}

export async function updateCalendarById(
  supabase: SupabaseClient,
  calendarId: string,
  updates: { name?: string; colorHex?: string },
): Promise<void> {
  const payload: Record<string, string> = {};
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.colorHex !== undefined) payload.color_hex = updates.colorHex;

  const { error } = await supabase
    .from("calendars")
    .update(payload)
    .eq("id", calendarId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteCalendarById(
  supabase: SupabaseClient,
  calendarId: string,
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from("calendars")
    .delete()
    .eq("id", calendarId)
    .eq("owner_id", userId);

  if (error) {
    throw new Error(error.message);
  }

  const visibleIds = await fetchVisibleCalendarIds(supabase, userId);
  await updateVisibleCalendarIds(
    supabase,
    userId,
    visibleIds.filter((id) => id !== calendarId),
  );
}

export async function fetchCalendarById(
  supabase: SupabaseClient,
  calendarId: string,
): Promise<{ id: string; owner_id: string; type: CalendarType } | null> {
  const { data, error } = await supabase
    .from("calendars")
    .select("id, owner_id, type")
    .eq("id", calendarId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
