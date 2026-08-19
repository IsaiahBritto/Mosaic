import {
  differenceInCalendarDays,
  differenceInCalendarMonths,
  differenceInCalendarWeeks,
  differenceInCalendarYears,
  parseISO,
} from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import {
  addCalendarDays,
  formatCalendarDate,
  getCalendarDayOfWeek,
  getCalendarDayUtcRange,
  parseCalendarDateParam,
} from "@/lib/calendar/timezone";
import type {
  Event,
  EventInstance,
  RecurrenceException,
  RecurrenceRule,
} from "@/types/event";

const MAX_INSTANCES = 500;
const MAX_ITERATIONS = 5000;

function applyMasterTime(
  calendarDate: string,
  masterStartIso: string,
  timezone: string,
  isAllDay: boolean,
): Date {
  if (isAllDay) {
    return getCalendarDayUtcRange(calendarDate, timezone).start;
  }

  const timeStr = formatInTimeZone(masterStartIso, timezone, "HH:mm:ss");
  return fromZonedTime(`${calendarDate}T${timeStr}`, timezone);
}

function isRecurrenceMatch(
  calendarDate: string,
  masterStart: Date,
  rule: RecurrenceRule,
  timezone: string,
): boolean {
  const masterDate = formatCalendarDate(masterStart, timezone);

  if (calendarDate < masterDate) {
    return false;
  }

  if (rule.endDate && calendarDate > rule.endDate) {
    return false;
  }

  const day = parseCalendarDateParam(calendarDate, timezone);
  const masterDay = parseCalendarDateParam(masterDate, timezone);

  switch (rule.frequency) {
    case "daily": {
      const diff = differenceInCalendarDays(day, masterDay);
      return diff % rule.intervalCount === 0;
    }
    case "weekly": {
      if (!rule.daysOfWeek.includes(getCalendarDayOfWeek(calendarDate, timezone))) {
        return false;
      }
      const diffWeeks = differenceInCalendarWeeks(day, masterDay, {
        weekStartsOn: 0,
      });
      return diffWeeks % rule.intervalCount === 0;
    }
    case "monthly": {
      const monthsDiff = differenceInCalendarMonths(day, masterDay);
      if (monthsDiff % rule.intervalCount !== 0) {
        return false;
      }
      return (
        formatInTimeZone(day, timezone, "d") ===
        formatInTimeZone(masterDay, timezone, "d")
      );
    }
    case "yearly": {
      const yearsDiff = differenceInCalendarYears(day, masterDay);
      if (yearsDiff % rule.intervalCount !== 0) {
        return false;
      }
      return (
        formatInTimeZone(day, timezone, "MM-dd") ===
        formatInTimeZone(masterDay, timezone, "MM-dd")
      );
    }
    default:
      return false;
  }
}

function findException(
  exceptions: RecurrenceException[],
  originalStartAt: string,
): RecurrenceException | undefined {
  const target = parseISO(originalStartAt).getTime();
  return exceptions.find(
    (exception) =>
      parseISO(exception.originalStartAt).getTime() === target,
  );
}

/** Expand a recurring master event into instances within a date range. */
export function expandRecurrence(
  master: Event,
  rule: RecurrenceRule,
  rangeStart: Date,
  rangeEnd: Date,
  exceptions: RecurrenceException[] = [],
): EventInstance[] {
  const instances: EventInstance[] = [];
  const tz = master.timezone;
  const masterStart = parseISO(master.startAt);
  const masterEnd = parseISO(master.endAt);
  const durationMs = masterEnd.getTime() - masterStart.getTime();
  const masterExceptions = exceptions.filter(
    (exception) => exception.eventId === master.id,
  );

  let current = formatCalendarDate(masterStart, tz);
  const loopEnd = formatCalendarDate(rangeEnd, tz);
  let iterations = 0;

  while (
    current <= loopEnd &&
    iterations < MAX_ITERATIONS &&
    instances.length < MAX_INSTANCES
  ) {
    iterations += 1;

    if (isRecurrenceMatch(current, masterStart, rule, tz)) {
      const instanceStart = applyMasterTime(
        current,
        master.startAt,
        tz,
        master.isAllDay,
      );
      const isoStart = instanceStart.toISOString();
      const exception = findException(masterExceptions, isoStart);

      if (exception && !exception.overrideStartAt) {
        current = addCalendarDays(current, 1, tz);
        continue;
      }

      const resolvedStart = exception?.overrideStartAt
        ? parseISO(exception.overrideStartAt)
        : instanceStart;
      const resolvedEnd = exception?.overrideEndAt
        ? parseISO(exception.overrideEndAt)
        : new Date(resolvedStart.getTime() + durationMs);

      if (resolvedEnd >= rangeStart && resolvedStart <= rangeEnd) {
        instances.push({
          ...master,
          instanceId: `${master.id}_${isoStart}`,
          masterEventId: master.id,
          originalOccurrenceStartAt: isoStart,
          startAt: resolvedStart.toISOString(),
          endAt: resolvedEnd.toISOString(),
        });
      }
    }

    current = addCalendarDays(current, 1, tz);
  }

  return instances;
}

/** Return true when an event overlaps a query range (non-recurring). */
export function eventOverlapsRange(
  event: Event,
  rangeStart: Date,
  rangeEnd: Date,
): boolean {
  const start = parseISO(event.startAt);
  const end = parseISO(event.endAt);
  return end >= rangeStart && start <= rangeEnd;
}

/** Expand all events (recurring + single) for a range. */
export function expandRecurringEvents(
  events: Event[],
  rangeStart: Date,
  rangeEnd: Date,
  exceptions: RecurrenceException[] = [],
): EventInstance[] {
  const result: EventInstance[] = [];

  for (const event of events) {
    if (event.recurrence) {
      result.push(
        ...expandRecurrence(
          event,
          event.recurrence,
          rangeStart,
          rangeEnd,
          exceptions,
        ),
      );
    } else if (eventOverlapsRange(event, rangeStart, rangeEnd)) {
      result.push({
        ...event,
        instanceId: event.id,
        masterEventId: event.id,
      });
    }
  }

  return result.sort(
    (a, b) => parseISO(a.startAt).getTime() - parseISO(b.startAt).getTime(),
  );
}
