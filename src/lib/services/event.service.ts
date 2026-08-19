import type { SupabaseClient } from "@supabase/supabase-js";
import { endOfDay, parseISO, startOfDay } from "date-fns";
import { buildEventTimestamps, utcToLocal } from "@/lib/calendar/timezone";
import { AppError } from "@/lib/errors";
import {
  deleteEventById,
  deleteEventRecurrence,
  fetchEventById,
  fetchEventsInRange,
  fetchWritableCalendars,
  insertEvent,
  updateEventById,
  upsertEventRecurrence,
} from "@/lib/repositories/events.repository";
import { requireCalendarRole } from "@/lib/services/permissions.service";
import type { Event, WritableCalendarOption } from "@/types/event";
import type { EventFormInput } from "@/lib/validation/event";

function formToPayload(input: EventFormInput) {
  const { startAt, endAt } = buildEventTimestamps({
    startDate: input.startDate,
    endDate: input.endDate,
    startTime: input.startTime,
    endTime: input.endTime,
    timezone: input.timezone,
    isAllDay: input.isAllDay,
  });

  return {
    calendarId: input.calendarId,
    title: input.title.trim(),
    location: input.location?.trim() || null,
    notes: input.notes?.trim() || null,
    startAt,
    endAt,
    isAllDay: input.isAllDay,
    timezone: input.timezone,
    travelBeforeMinutes: input.travelBeforeMinutes,
    travelAfterMinutes: input.travelAfterMinutes,
    isHoliday: input.isHoliday,
    recurrence: input.recurrence ?? null,
  };
}

async function syncRecurrence(
  supabase: SupabaseClient,
  eventId: string,
  recurrence: EventFormInput["recurrence"],
): Promise<void> {
  if (recurrence) {
    await upsertEventRecurrence(supabase, eventId, recurrence);
  } else {
    await deleteEventRecurrence(supabase, eventId);
  }
}

export async function getWritableCalendarOptions(
  supabase: SupabaseClient,
  userId: string,
): Promise<WritableCalendarOption[]> {
  const rows = await fetchWritableCalendars(supabase, userId);
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    colorHex: row.color_hex,
  }));
}

export async function getEventForUser(
  supabase: SupabaseClient,
  userId: string,
  eventId: string,
): Promise<Event> {
  const event = await fetchEventById(supabase, eventId);
  if (!event) {
    throw new AppError("NOT_FOUND", "Event not found", 404);
  }

  await requireCalendarRole(supabase, userId, event.calendarId, "viewer");
  return event;
}

export async function createEventForUser(
  supabase: SupabaseClient,
  userId: string,
  input: EventFormInput,
): Promise<Event> {
  const payload = formToPayload(input);
  await requireCalendarRole(supabase, userId, payload.calendarId, "editor");

  const event = await insertEvent(supabase, {
    ...payload,
    createdBy: userId,
  });

  await syncRecurrence(supabase, event.id, input.recurrence ?? null);

  const full = await fetchEventById(supabase, event.id);
  if (!full) {
    throw new AppError("UNKNOWN", "Failed to load created event", 500);
  }

  return full;
}

export async function updateEventForUser(
  supabase: SupabaseClient,
  userId: string,
  eventId: string,
  input: EventFormInput,
): Promise<Event> {
  const existing = await fetchEventById(supabase, eventId);
  if (!existing) {
    throw new AppError("NOT_FOUND", "Event not found", 404);
  }

  await requireCalendarRole(supabase, userId, existing.calendarId, "editor");

  const payload = formToPayload(input);
  await requireCalendarRole(supabase, userId, payload.calendarId, "editor");

  await updateEventById(supabase, eventId, payload);
  await syncRecurrence(supabase, eventId, input.recurrence ?? null);

  const full = await fetchEventById(supabase, eventId);
  if (!full) {
    throw new AppError("UNKNOWN", "Failed to load updated event", 500);
  }

  return full;
}

export async function deleteEventForUser(
  supabase: SupabaseClient,
  userId: string,
  eventId: string,
): Promise<void> {
  const existing = await fetchEventById(supabase, eventId);
  if (!existing) {
    throw new AppError("NOT_FOUND", "Event not found", 404);
  }

  await requireCalendarRole(supabase, userId, existing.calendarId, "editor");
  await deleteEventById(supabase, eventId);
}

export async function getEventsInRangeForCalendars(
  supabase: SupabaseClient,
  calendarIds: string[],
  rangeStart: Date,
  rangeEnd: Date,
): Promise<Event[]> {
  return fetchEventsInRange(
    supabase,
    calendarIds,
    rangeStart.toISOString(),
    rangeEnd.toISOString(),
  );
}

export async function getEventsForDay(
  supabase: SupabaseClient,
  calendarIds: string[],
  date: Date,
  tz: string,
): Promise<Event[]> {
  void tz;
  const dayStart = startOfDay(date);
  const dayEnd = endOfDay(date);
  return getEventsInRangeForCalendars(supabase, calendarIds, dayStart, dayEnd);
}

export function eventToFormDefaults(event: Event): EventFormInput {
  const startLocal = utcToLocal(event.startAt, event.timezone);
  const endLocal = utcToLocal(event.endAt, event.timezone);

  return {
    title: event.title,
    location: event.location ?? undefined,
    notes: event.notes ?? undefined,
    calendarId: event.calendarId,
    isAllDay: event.isAllDay,
    startDate: startLocal.date,
    endDate: endLocal.date,
    startTime: event.isAllDay ? undefined : startLocal.time,
    endTime: event.isAllDay ? undefined : endLocal.time,
    timezone: event.timezone,
    travelBeforeMinutes: event.travelBeforeMinutes,
    travelAfterMinutes: event.travelAfterMinutes,
    isHoliday: event.isHoliday,
    recurrence: event.recurrence,
  };
}

export function buildDefaultEventFormValues(options: {
  defaultDate: string;
  calendarId: string;
  timezone: string;
  startTime?: string;
}): EventFormInput {
  const startTime = options.startTime ?? "09:00";
  const [hours, minutes] = startTime.split(":").map(Number);
  const endHour = (hours ?? 9) + 1;
  const endTime = `${String(endHour).padStart(2, "0")}:${String(minutes ?? 0).padStart(2, "0")}`;

  return {
    title: "",
    location: "",
    notes: "",
    calendarId: options.calendarId,
    isAllDay: false,
    startDate: options.defaultDate,
    endDate: options.defaultDate,
    startTime,
    endTime,
    timezone: options.timezone,
    travelBeforeMinutes: 0,
    travelAfterMinutes: 0,
    isHoliday: false,
    recurrence: null,
  };
}

export function getExitDateFromEvent(event: Event): Date {
  return startOfDay(parseISO(event.startAt));
}
