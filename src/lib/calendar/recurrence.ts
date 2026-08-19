import {
  addDays,
  differenceInCalendarDays,
  differenceInCalendarMonths,
  differenceInCalendarWeeks,
  differenceInCalendarYears,
  endOfDay,
  parseISO,
  set,
  startOfDay,
} from "date-fns";
import type { Event, EventInstance, RecurrenceRule } from "@/types/event";

const MAX_INSTANCES = 500;
const MAX_ITERATIONS = 5000;

function applyMasterTime(day: Date, masterStart: Date, isAllDay: boolean): Date {
  if (isAllDay) {
    return startOfDay(day);
  }
  return set(day, {
    hours: masterStart.getHours(),
    minutes: masterStart.getMinutes(),
    seconds: masterStart.getSeconds(),
    milliseconds: masterStart.getMilliseconds(),
  });
}

function isRecurrenceMatch(
  candidateDay: Date,
  masterStart: Date,
  rule: RecurrenceRule,
): boolean {
  const day = startOfDay(candidateDay);
  const masterDay = startOfDay(masterStart);

  if (day < masterDay) {
    return false;
  }

  switch (rule.frequency) {
    case "daily": {
      const diff = differenceInCalendarDays(day, masterDay);
      return diff % rule.intervalCount === 0;
    }
    case "weekly": {
      if (!rule.daysOfWeek.includes(day.getDay())) {
        return false;
      }
      const diffWeeks = differenceInCalendarWeeks(day, masterDay, {
        weekStartsOn: 0,
      });
      return diffWeeks % rule.intervalCount === 0;
    }
    case "monthly": {
      const monthsDiff = differenceInCalendarMonths(day, masterStart);
      if (monthsDiff % rule.intervalCount !== 0) {
        return false;
      }
      return day.getDate() === masterStart.getDate();
    }
    case "yearly": {
      const yearsDiff = differenceInCalendarYears(day, masterStart);
      if (yearsDiff % rule.intervalCount !== 0) {
        return false;
      }
      return (
        day.getMonth() === masterStart.getMonth() &&
        day.getDate() === masterStart.getDate()
      );
    }
    default:
      return false;
  }
}

function createInstance(
  master: Event,
  instanceStart: Date,
  durationMs: number,
): EventInstance {
  const instanceEnd = new Date(instanceStart.getTime() + durationMs);
  const isoStart = instanceStart.toISOString();

  return {
    ...master,
    instanceId: `${master.id}_${isoStart}`,
    masterEventId: master.id,
    startAt: isoStart,
    endAt: instanceEnd.toISOString(),
  };
}

/** Expand a recurring master event into instances within a date range. */
export function expandRecurrence(
  master: Event,
  rule: RecurrenceRule,
  rangeStart: Date,
  rangeEnd: Date,
): EventInstance[] {
  const instances: EventInstance[] = [];
  const masterStart = parseISO(master.startAt);
  const masterEnd = parseISO(master.endAt);
  const durationMs = masterEnd.getTime() - masterStart.getTime();
  const recurrenceEnd = rule.endDate
    ? endOfDay(parseISO(`${rule.endDate}T12:00:00`))
    : null;

  let cursor = startOfDay(masterStart);
  let iterations = 0;

  while (
    cursor <= rangeEnd &&
    iterations < MAX_ITERATIONS &&
    instances.length < MAX_INSTANCES
  ) {
    iterations += 1;

    if (recurrenceEnd && cursor > recurrenceEnd) {
      break;
    }

    if (isRecurrenceMatch(cursor, masterStart, rule)) {
      const instanceStart = applyMasterTime(cursor, masterStart, master.isAllDay);
      const instanceEnd = new Date(instanceStart.getTime() + durationMs);

      if (instanceEnd >= rangeStart && instanceStart <= rangeEnd) {
        instances.push(createInstance(master, instanceStart, durationMs));
      }
    }

    cursor = addDays(cursor, 1);
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
): EventInstance[] {
  const result: EventInstance[] = [];

  for (const event of events) {
    if (event.recurrence) {
      result.push(...expandRecurrence(event, event.recurrence, rangeStart, rangeEnd));
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
