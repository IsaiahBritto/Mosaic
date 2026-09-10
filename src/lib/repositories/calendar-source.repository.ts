import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "@/lib/errors";
import { isCalendarReadOnly } from "@/lib/integrations/google/event-map";
import type { CalendarSource } from "@/types/calendar";

export type CalendarSourceRow = {
  id: string;
  source: CalendarSource;
  external_calendar_access_role: string | null;
};

export async function fetchCalendarSource(
  supabase: SupabaseClient,
  calendarId: string,
): Promise<CalendarSourceRow | null> {
  const { data, error } = await supabase
    .from("calendars")
    .select("id, source, external_calendar_access_role")
    .eq("id", calendarId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) return null;

  return {
    id: data.id,
    source: (data.source as CalendarSource) ?? "native",
    external_calendar_access_role: data.external_calendar_access_role,
  };
}

export function isLinkedCalendar(source: CalendarSource): boolean {
  return source === "google" || source === "apple";
}

export function assertCalendarWritable(calendar: CalendarSourceRow): void {
  if (isCalendarReadOnly(calendar.external_calendar_access_role)) {
    throw new AppError(
      "FORBIDDEN",
      "This calendar is view-only in Google/iCloud",
      403,
    );
  }
}
