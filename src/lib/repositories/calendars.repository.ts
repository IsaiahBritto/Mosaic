import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Calendar,
  CalendarRole,
  CalendarRow,
  CalendarSource,
  CalendarType,
} from "@/types/calendar";
import { isCalendarReadOnly } from "@/lib/integrations/google/event-map";

type CalendarMemberJoin = {
  role: CalendarRole;
  invite_status: string;
  name_override: string | null;
  color_hex_override: string | null;
  calendars: {
    id: string;
    owner_id: string;
    name: string;
    color_hex: string;
    type: CalendarType;
    source: CalendarSource;
    connection_id: string | null;
    external_calendar_access_role: string | null;
    is_visible_default: boolean;
    created_at: string;
  };
};

export function mapCalendarRow(
  row: CalendarMemberJoin["calendars"],
  role: CalendarRole,
  visibleIds: string[],
  overrides?: {
    nameOverride?: string | null;
    colorHexOverride?: string | null;
  },
): Calendar {
  const isVisible = visibleIds.includes(row.id);
  const canonicalName = row.name;
  const canonicalColorHex = row.color_hex;
  const name = overrides?.nameOverride ?? canonicalName;
  const colorHex = overrides?.colorHexOverride ?? canonicalColorHex;
  const hasPersonalOverride = Boolean(
    overrides?.nameOverride ?? overrides?.colorHexOverride,
  );

  return {
    id: row.id,
    name,
    colorHex,
    type: row.type,
    source: row.source ?? "native",
    ownerId: row.owner_id,
    isVisible,
    role,
    connectionId: row.connection_id,
    readOnly: isCalendarReadOnly(row.external_calendar_access_role),
    canonicalName,
    canonicalColorHex,
    hasPersonalOverride,
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
      name_override,
      color_hex_override,
      calendars (
        id,
        owner_id,
        name,
        color_hex,
        type,
        source,
        connection_id,
        external_calendar_access_role,
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
      mapCalendarRow(row.calendars, row.role, visibleIds, {
        nameOverride: row.name_override,
        colorHexOverride: row.color_hex_override,
      }),
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

export async function updateCalendarType(
  supabase: SupabaseClient,
  calendarId: string,
  type: CalendarType,
): Promise<void> {
  const { error } = await supabase
    .from("calendars")
    .update({ type })
    .eq("id", calendarId);

  if (error) {
    throw new Error(error.message);
  }
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
): Promise<{
  id: string;
  owner_id: string;
  name: string;
  type: CalendarType;
  source: CalendarSource;
} | null> {
  const { data, error } = await supabase
    .from("calendars")
    .select("id, owner_id, name, type, source")
    .eq("id", calendarId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
