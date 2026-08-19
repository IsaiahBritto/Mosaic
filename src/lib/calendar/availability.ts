import {
  addMinutes,
  differenceInMinutes,
  endOfDay,
  format,
  isSameDay,
  parseISO,
  startOfDay,
} from "date-fns";
import { formatInTimeZone, toZonedTime } from "date-fns-tz";
import {
  BUSY_EVENT_COUNT,
  PARTIAL_THRESHOLD,
  WAKING_END_HOUR,
  WAKING_START_HOUR,
} from "@/lib/calendar/constants";
import {
  addCalendarDays,
  formatCalendarDate,
  parseCalendarDateParam,
} from "@/lib/calendar/timezone";
import type { EventInstance } from "@/types/event";

export type DayStatus = "free" | "busy" | "partial" | "holiday";

export type AvailabilityDot = DayStatus;

export type DayAvailability = {
  date: string;
  status: DayStatus;
  dots: AvailabilityDot[];
};

function dateKey(date: Date, timezone: string): string {
  return formatInTimeZone(date, timezone, "yyyy-MM-dd");
}

function eventsOnDate(
  date: Date,
  events: EventInstance[],
  timezone: string,
): EventInstance[] {
  const dayStart = startOfDay(toZonedTime(date, timezone));
  const dayEnd = endOfDay(toZonedTime(date, timezone));

  return events.filter((event) => {
    const start = parseISO(event.startAt);
    const end = parseISO(event.endAt);
    return end >= dayStart && start <= dayEnd;
  });
}

function busyMinutesOnDate(
  date: Date,
  dayEvents: EventInstance[],
  timezone: string,
): number {
  const wakingStart = addMinutes(
    startOfDay(toZonedTime(date, timezone)),
    WAKING_START_HOUR * 60,
  );
  const wakingEnd = addMinutes(
    startOfDay(toZonedTime(date, timezone)),
    WAKING_END_HOUR * 60,
  );
  const wakingMinutes = differenceInMinutes(wakingEnd, wakingStart);

  let busy = 0;

  for (const event of dayEvents) {
    if (event.isAllDay) {
      return wakingMinutes;
    }

    const start = toZonedTime(parseISO(event.startAt), timezone);
    const end = toZonedTime(parseISO(event.endAt), timezone);
    const clampedStart = start < wakingStart ? wakingStart : start;
    const clampedEnd = end > wakingEnd ? wakingEnd : end;

    if (clampedEnd > clampedStart) {
      busy += differenceInMinutes(clampedEnd, clampedStart);
    }

    busy += event.travelBeforeMinutes + event.travelAfterMinutes;
  }

  return Math.min(busy, wakingMinutes);
}

function deriveStatus(
  dayEvents: EventInstance[],
  busyRatio: number,
): DayStatus {
  if (dayEvents.some((event) => event.isHoliday)) {
    return "holiday";
  }

  if (dayEvents.length === 0) {
    return "free";
  }

  if (
    dayEvents.some((event) => event.isAllDay) ||
    dayEvents.length >= BUSY_EVENT_COUNT ||
    busyRatio >= PARTIAL_THRESHOLD
  ) {
    return "busy";
  }

  if (busyRatio > 0) {
    return "partial";
  }

  return "free";
}

function buildDots(dayEvents: EventInstance[], status: DayStatus): AvailabilityDot[] {
  if (dayEvents.length === 0) {
    return status === "free" ? ["free"] : [status];
  }

  const dots: AvailabilityDot[] = [];

  for (const event of dayEvents.slice(0, 3)) {
    if (event.isHoliday) {
      dots.push("holiday");
    } else if (event.isAllDay) {
      dots.push("busy");
    } else {
      dots.push("partial");
    }
  }

  while (dots.length < Math.min(3, dayEvents.length)) {
    dots.push(status === "free" ? "free" : status);
  }

  return dots.slice(0, 3);
}

export function computeDayAvailability(
  date: Date,
  events: EventInstance[],
  timezone: string,
): DayAvailability {
  const dayEvents = eventsOnDate(date, events, timezone);
  const wakingMinutes = (WAKING_END_HOUR - WAKING_START_HOUR) * 60;
  const busyMinutes = busyMinutesOnDate(date, dayEvents, timezone);
  const busyRatio = wakingMinutes > 0 ? busyMinutes / wakingMinutes : 0;
  const status = deriveStatus(dayEvents, busyRatio);

  return {
    date: dateKey(date, timezone),
    status,
    dots: buildDots(dayEvents, status),
  };
}

export function computeRangeAvailability(
  startDate: Date,
  endDate: Date,
  events: EventInstance[],
  timezone: string,
): Map<string, DayAvailability> {
  const map = new Map<string, DayAvailability>();
  let current = formatCalendarDate(startDate, timezone);
  const end = formatCalendarDate(endDate, timezone);

  while (current <= end) {
    const availability = computeDayAvailability(
      parseCalendarDateParam(current, timezone),
      events,
      timezone,
    );
    map.set(availability.date, availability);
    current = addCalendarDays(current, 1, timezone);
  }

  return map;
}

export function getMonthGridDates(monthDate: Date): Date[] {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = firstOfMonth.getDay();
  const gridStart = new Date(year, month, 1 - startOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return date;
  });
}

export function isDateInMonth(date: Date, monthDate: Date): boolean {
  return (
    date.getMonth() === monthDate.getMonth() &&
    date.getFullYear() === monthDate.getFullYear()
  );
}

export function formatMonthYear(date: Date): string {
  return format(date, "MMMM yyyy");
}

export function isSameCalendarDay(
  a: Date,
  b: Date,
  timezone: string,
): boolean {
  return formatInTimeZone(a, timezone, "yyyy-MM-dd") ===
    formatInTimeZone(b, timezone, "yyyy-MM-dd");
}

export { isSameDay };
