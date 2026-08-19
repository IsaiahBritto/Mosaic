import { endOfDay, parseISO, startOfDay } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { expandRecurringEvents } from "@/lib/calendar/recurrence";
import { getVisibleCalendarIdsForUser } from "@/lib/services/calendar.service";
import { fetchRecurrenceExceptionsForEvents } from "@/lib/repositories/events.repository";
import {
  getEventsForDay as getEventsForDayService,
  getEventsInRangeForCalendars,
} from "@/lib/services/event.service";
import type { Event, EventInstance } from "@/types/event";

/** Visible calendar IDs for event/view queries (Phases 3–4). */
export async function getVisibleCalendarIdsForUserFromSession(): Promise<
  string[]
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  return getVisibleCalendarIdsForUser(supabase, user.id);
}

export async function getEventsInRange(
  rangeStart: Date,
  rangeEnd: Date,
  calendarIds?: string[],
): Promise<Event[]> {
  const supabase = await createClient();
  const ids =
    calendarIds ?? (await getVisibleCalendarIdsForUserFromSession());

  return getEventsInRangeForCalendars(supabase, ids, rangeStart, rangeEnd);
}

export async function getEventsForDay(
  date: Date,
  calendarIds: string[],
  tz: string,
): Promise<Event[]> {
  const supabase = await createClient();
  return getEventsForDayService(supabase, calendarIds, date, tz);
}

export async function expandRecurringEventsInRange(
  events: Event[],
  rangeStart: Date,
  rangeEnd: Date,
): Promise<EventInstance[]> {
  const supabase = await createClient();
  const recurringIds = events
    .filter((event) => event.recurrence)
    .map((event) => event.id);
  const exceptions =
    recurringIds.length > 0
      ? await fetchRecurrenceExceptionsForEvents(
          supabase,
          recurringIds,
          rangeStart.toISOString(),
          rangeEnd.toISOString(),
        )
      : [];

  return expandRecurringEvents(events, rangeStart, rangeEnd, exceptions);
}

export async function getExpandedEventsInRange(
  rangeStart: Date,
  rangeEnd: Date,
  calendarIds?: string[],
): Promise<EventInstance[]> {
  const events = await getEventsInRange(rangeStart, rangeEnd, calendarIds);
  return expandRecurringEventsInRange(events, rangeStart, rangeEnd);
}

export async function getExpandedEventsForDay(
  date: Date,
  tz: string,
  calendarIds?: string[],
): Promise<EventInstance[]> {
  const ids =
    calendarIds ?? (await getVisibleCalendarIdsForUserFromSession());
  const dayStart = startOfDay(date);
  const dayEnd = endOfDay(date);
  const events = await getEventsForDay(date, ids, tz);
  return expandRecurringEventsInRange(events, dayStart, dayEnd);
}

export { parseISO };
