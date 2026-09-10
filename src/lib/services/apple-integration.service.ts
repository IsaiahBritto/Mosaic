import type { SupabaseClient } from "@supabase/supabase-js";
import { discoverAppleCalendars } from "@/lib/integrations/apple/discover";
import { mapAppleColor } from "@/lib/integrations/apple/ical-map";
import { getCalDavCredentials } from "@/lib/integrations/apple/credentials";
import type { SelectedAppleCalendar } from "@/lib/integrations/sync-types";
import {
  fetchVisibleCalendarIds,
  updateVisibleCalendarIds,
} from "@/lib/repositories/calendars.repository";
import { fetchConnectionById } from "@/lib/repositories/connections.repository";

export async function listAppleCalendarsForConnection(
  supabase: SupabaseClient,
  userId: string,
  connectionId: string,
) {
  const connection = await fetchConnectionById(supabase, connectionId);
  if (
    !connection ||
    connection.user_id !== userId ||
    connection.provider !== "apple"
  ) {
    throw new Error("Connection not found");
  }

  const credentials = await getCalDavCredentials(supabase, connectionId);
  return discoverAppleCalendars(
    credentials.username,
    credentials.password,
    credentials.baseUrl,
  );
}

export async function saveSelectedAppleCalendars(
  supabase: SupabaseClient,
  userId: string,
  connectionId: string,
  selected: SelectedAppleCalendar[],
): Promise<string[]> {
  if (selected.length === 0) {
    throw new Error("Select at least one calendar");
  }

  const connection = await fetchConnectionById(supabase, connectionId);
  if (
    !connection ||
    connection.user_id !== userId ||
    connection.provider !== "apple"
  ) {
    throw new Error("Connection not found");
  }

  const calendarIds: string[] = [];
  const visibleIds = await fetchVisibleCalendarIds(supabase, userId);

  for (const item of selected) {
    const { data: existing } = await supabase
      .from("calendars")
      .select("id")
      .eq("connection_id", connectionId)
      .eq("external_calendar_id", item.externalCalendarId)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("calendars")
        .update({
          name: item.name,
          color_hex: item.colorHex,
          sync_enabled: true,
          external_caldav_path: item.caldavPath,
          external_calendar_access_role: item.accessRole ?? "owner",
        })
        .eq("id", existing.id);
      calendarIds.push(existing.id);
      continue;
    }

    const { data: calendar, error: calError } = await supabase
      .from("calendars")
      .insert({
        owner_id: userId,
        name: item.name,
        color_hex: item.colorHex,
        type: "native",
        source: "apple",
        connection_id: connectionId,
        external_calendar_id: item.externalCalendarId,
        external_caldav_path: item.caldavPath,
        sync_enabled: true,
        external_calendar_access_role: item.accessRole ?? "owner",
        is_visible_default: true,
      })
      .select("id")
      .single();

    if (calError || !calendar) {
      throw new Error(calError?.message ?? "Failed to import calendar");
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

    calendarIds.push(calendar.id);
  }

  await updateVisibleCalendarIds(supabase, userId, [
    ...new Set([...visibleIds, ...calendarIds]),
  ]);

  return calendarIds;
}

export function mapSelectedAppleCalendars(
  items: Array<{
    id: string;
    href: string;
    name: string;
    accessRole: string;
  }>,
  selectedIds: string[],
  colorOffset = 0,
): SelectedAppleCalendar[] {
  return items
    .filter((item) => selectedIds.includes(item.id))
    .map((item, index) => ({
      externalCalendarId: item.id,
      caldavPath: item.href,
      name: item.name,
      colorHex: mapAppleColor(colorOffset + index),
      accessRole: item.accessRole,
    }));
}
