import type { SupabaseClient } from "@supabase/supabase-js";
import type { CalendarRole } from "@/types/calendar";
import type { Event, RecurrenceRule } from "@/types/event";

type EventRowJoin = {
  id: string;
  calendar_id: string;
  title: string;
  location: string | null;
  notes: string | null;
  start_at: string;
  end_at: string;
  is_all_day: boolean;
  timezone: string;
  travel_before_minutes: number;
  travel_after_minutes: number;
  is_holiday: boolean;
  calendars: {
    id: string;
    name: string;
    color_hex: string;
  };
  event_recurrence: {
    frequency: RecurrenceRule["frequency"];
    interval_count: number;
    days_of_week: number[];
    end_date: string | null;
  } | null;
};

function mapRecurrenceRow(
  row: EventRowJoin["event_recurrence"],
): RecurrenceRule | null {
  if (!row) {
    return null;
  }

  return {
    frequency: row.frequency,
    intervalCount: row.interval_count,
    daysOfWeek: row.days_of_week ?? [],
    endDate: row.end_date,
  };
}

export function mapEventRow(row: EventRowJoin): Event {
  return {
    id: row.id,
    calendarId: row.calendar_id,
    calendarColor: row.calendars.color_hex,
    calendarName: row.calendars.name,
    title: row.title,
    location: row.location,
    notes: row.notes,
    startAt: row.start_at,
    endAt: row.end_at,
    isAllDay: row.is_all_day,
    timezone: row.timezone,
    travelBeforeMinutes: row.travel_before_minutes,
    travelAfterMinutes: row.travel_after_minutes,
    isHoliday: row.is_holiday,
    recurrence: mapRecurrenceRow(row.event_recurrence),
  };
}

const EVENT_SELECT = `
  id,
  calendar_id,
  title,
  location,
  notes,
  start_at,
  end_at,
  is_all_day,
  timezone,
  travel_before_minutes,
  travel_after_minutes,
  is_holiday,
  calendars (
    id,
    name,
    color_hex
  ),
  event_recurrence (
    frequency,
    interval_count,
    days_of_week,
    end_date
  )
`;

export async function fetchEventById(
  supabase: SupabaseClient,
  eventId: string,
): Promise<Event | null> {
  const { data, error } = await supabase
    .from("events")
    .select(EVENT_SELECT)
    .eq("id", eventId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  return mapEventRow(data as unknown as EventRowJoin);
}

export async function fetchEventsInRange(
  supabase: SupabaseClient,
  calendarIds: string[],
  rangeStart: string,
  rangeEnd: string,
): Promise<Event[]> {
  if (calendarIds.length === 0) {
    return [];
  }

  const { data: overlapping, error: overlapError } = await supabase
    .from("events")
    .select(EVENT_SELECT)
    .in("calendar_id", calendarIds)
    .lte("start_at", rangeEnd)
    .gte("end_at", rangeStart)
    .order("start_at", { ascending: true });

  if (overlapError) {
    throw new Error(overlapError.message);
  }

  const recurringSelect = EVENT_SELECT.replace(
    "event_recurrence (",
    "event_recurrence!inner (",
  );

  const { data: recurring, error: recurringError } = await supabase
    .from("events")
    .select(recurringSelect)
    .in("calendar_id", calendarIds)
    .lte("start_at", rangeEnd);

  if (recurringError) {
    throw new Error(recurringError.message);
  }

  const byId = new Map<string, Event>();
  for (const row of [
    ...((overlapping ?? []) as unknown as EventRowJoin[]),
    ...((recurring ?? []) as unknown as EventRowJoin[]),
  ]) {
    byId.set(row.id, mapEventRow(row));
  }

  return Array.from(byId.values()).sort(
    (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
  );
}

export type InsertEventPayload = {
  calendarId: string;
  createdBy: string;
  title: string;
  location: string | null;
  notes: string | null;
  startAt: string;
  endAt: string;
  isAllDay: boolean;
  timezone: string;
  travelBeforeMinutes: number;
  travelAfterMinutes: number;
  isHoliday: boolean;
};

export async function insertEvent(
  supabase: SupabaseClient,
  payload: InsertEventPayload,
): Promise<Event> {
  const { data, error } = await supabase
    .from("events")
    .insert({
      calendar_id: payload.calendarId,
      created_by: payload.createdBy,
      title: payload.title,
      location: payload.location,
      notes: payload.notes,
      start_at: payload.startAt,
      end_at: payload.endAt,
      is_all_day: payload.isAllDay,
      timezone: payload.timezone,
      travel_before_minutes: payload.travelBeforeMinutes,
      travel_after_minutes: payload.travelAfterMinutes,
      is_holiday: payload.isHoliday,
    })
    .select(EVENT_SELECT)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create event");
  }

  return mapEventRow(data as unknown as EventRowJoin);
}

export type UpdateEventPayload = Omit<
  InsertEventPayload,
  "createdBy" | "calendarId"
> & {
  calendarId: string;
};

export async function updateEventById(
  supabase: SupabaseClient,
  eventId: string,
  payload: UpdateEventPayload,
): Promise<Event> {
  const { data, error } = await supabase
    .from("events")
    .update({
      calendar_id: payload.calendarId,
      title: payload.title,
      location: payload.location,
      notes: payload.notes,
      start_at: payload.startAt,
      end_at: payload.endAt,
      is_all_day: payload.isAllDay,
      timezone: payload.timezone,
      travel_before_minutes: payload.travelBeforeMinutes,
      travel_after_minutes: payload.travelAfterMinutes,
      is_holiday: payload.isHoliday,
    })
    .eq("id", eventId)
    .select(EVENT_SELECT)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to update event");
  }

  return mapEventRow(data as unknown as EventRowJoin);
}

export async function deleteEventById(
  supabase: SupabaseClient,
  eventId: string,
): Promise<void> {
  const { error } = await supabase.from("events").delete().eq("id", eventId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function upsertEventRecurrence(
  supabase: SupabaseClient,
  eventId: string,
  rule: RecurrenceRule,
): Promise<void> {
  const { error } = await supabase.from("event_recurrence").upsert(
    {
      event_id: eventId,
      frequency: rule.frequency,
      interval_count: rule.intervalCount,
      days_of_week: rule.daysOfWeek,
      end_date: rule.endDate,
    },
    { onConflict: "event_id" },
  );

  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteEventRecurrence(
  supabase: SupabaseClient,
  eventId: string,
): Promise<void> {
  const { error } = await supabase
    .from("event_recurrence")
    .delete()
    .eq("event_id", eventId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function fetchEventCalendarRole(
  supabase: SupabaseClient,
  userId: string,
  calendarId: string,
): Promise<CalendarRole | null> {
  const { data, error } = await supabase
    .from("calendar_members")
    .select("role")
    .eq("calendar_id", calendarId)
    .eq("user_id", userId)
    .eq("invite_status", "accepted")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data?.role as CalendarRole | undefined) ?? null;
}

export async function fetchWritableCalendars(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ id: string; name: string; color_hex: string }[]> {
  const { data, error } = await supabase
    .from("calendar_members")
    .select(
      `
      role,
      calendars (
        id,
        name,
        color_hex
      )
    `,
    )
    .eq("user_id", userId)
    .eq("invite_status", "accepted")
    .in("role", ["owner", "editor"]);

  if (error) {
    throw new Error(error.message);
  }

  type Row = {
    calendars: { id: string; name: string; color_hex: string } | null;
  };

  return ((data ?? []) as unknown as Row[])
    .map((row) => row.calendars)
    .filter((cal): cal is { id: string; name: string; color_hex: string } =>
      Boolean(cal),
    );
}
