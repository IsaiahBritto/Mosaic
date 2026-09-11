import type { SupabaseClient } from "@supabase/supabase-js";
import { GoogleCalendarClient } from "@/lib/integrations/google/client";
import { normalizeGoogleCalendarLabel } from "@/lib/integrations/google/calendar-display";
import { mapGoogleColor } from "@/lib/integrations/google/event-map";
import { getGoogleTokens } from "@/lib/integrations/google/token-store";
import type { SelectedGoogleCalendar } from "@/lib/integrations/sync-types";
import {
  fetchVisibleCalendarIds,
  updateVisibleCalendarIds,
} from "@/lib/repositories/calendars.repository";
import { fetchConnectionById } from "@/lib/repositories/connections.repository";

export async function listGoogleCalendarsForConnection(
  supabase: SupabaseClient,
  userId: string,
  connectionId: string,
): Promise<{ accountEmail: string; calendars: Awaited<ReturnType<GoogleCalendarClient["listCalendars"]>> }> {
  const connection = await fetchConnectionById(supabase, connectionId);
  if (!connection || connection.user_id !== userId || connection.provider !== "google") {
    throw new Error("Connection not found");
  }

  const { accessToken } = await getGoogleTokens(supabase, connectionId);
  const client = new GoogleCalendarClient(accessToken);
  const calendars = await client.listCalendars();
  return {
    accountEmail: connection.provider_account_email,
    calendars,
  };
}

export async function saveSelectedGoogleCalendars(
  supabase: SupabaseClient,
  userId: string,
  connectionId: string,
  selected: SelectedGoogleCalendar[],
): Promise<string[]> {
  if (selected.length === 0) {
    throw new Error("Select at least one calendar");
  }

  const connection = await fetchConnectionById(supabase, connectionId);
  if (!connection || connection.user_id !== userId || connection.provider !== "google") {
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
        source: "google",
        connection_id: connectionId,
        external_calendar_id: item.externalCalendarId,
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

export function mapSelectedCalendars(
  items: Array<{
    id: string;
    summary: string;
    backgroundColor?: string;
    accessRole: string;
    primary?: boolean;
  }>,
  selectedIds: string[],
  accountEmail: string,
): SelectedGoogleCalendar[] {
  return items
    .filter((item) => selectedIds.includes(item.id))
    .map((item) => ({
      externalCalendarId: item.id,
      name: normalizeGoogleCalendarLabel(item, accountEmail),
      colorHex: mapGoogleColor(item.backgroundColor),
      accessRole: item.accessRole,
    }));
}
