import { endOfDay, parseISO, addDays, addMonths, addWeeks, addYears } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export type LocalDateTimeParts = {
  date: string;
  time: string;
};

/** Convert form date/time in a timezone to UTC ISO string for DB storage. */
export function localToUtc(
  date: string,
  time: string | undefined,
  tz: string,
  options: { isAllDay: boolean; isEnd?: boolean },
): string {
  if (!DATE_PATTERN.test(date)) {
    throw new Error("Invalid date format");
  }

  if (options.isAllDay) {
    const localIso = options.isEnd
      ? `${date}T23:59:59.999`
      : `${date}T00:00:00.000`;
    return fromZonedTime(localIso, tz).toISOString();
  }

  const safeTime = time && TIME_PATTERN.test(time) ? time : "00:00";
  const localIso = `${date}T${safeTime}:00`;
  return fromZonedTime(localIso, tz).toISOString();
}

/** Convert UTC ISO string to local date/time parts in a timezone. */
export function utcToLocal(iso: string, tz: string): LocalDateTimeParts {
  return {
    date: formatInTimeZone(iso, tz, "yyyy-MM-dd"),
    time: formatInTimeZone(iso, tz, "HH:mm"),
  };
}

/** Detect the user's IANA timezone (client-only). */
export function getUserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/** Format event time for display (design: "00:00 AM" style). */
export function formatEventTime(
  iso: string,
  tz: string,
  isAllDay: boolean,
): string {
  if (isAllDay) {
    return "All day";
  }
  return formatInTimeZone(iso, tz, "hh:mm a");
}

export function buildEventTimestamps(input: {
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  timezone: string;
  isAllDay: boolean;
}): { startAt: string; endAt: string } {
  const startAt = localToUtc(input.startDate, input.startTime, input.timezone, {
    isAllDay: input.isAllDay,
    isEnd: false,
  });
  const endAt = localToUtc(input.endDate, input.endTime, input.timezone, {
    isAllDay: input.isAllDay,
    isEnd: true,
  });

  return { startAt, endAt };
}

export function isEndBeforeStart(startAt: string, endAt: string): boolean {
  return parseISO(endAt).getTime() < parseISO(startAt).getTime();
}

export function isValidTimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function endOfDayUtc(date: string, tz: string): string {
  return fromZonedTime(endOfDay(parseISO(`${date}T12:00:00`)), tz).toISOString();
}

/** Format a Date as YYYY-MM-DD in the user's display timezone. */
export function formatCalendarDate(date: Date, timezone: string): string {
  return formatInTimeZone(date, timezone, "yyyy-MM-dd");
}

/** Parse a calendar date param as noon local time for safe date arithmetic. */
export function parseCalendarDateParam(value: string, timezone: string): Date {
  if (!DATE_PATTERN.test(value)) {
    throw new Error("Invalid date format");
  }
  return fromZonedTime(`${value}T12:00:00`, timezone);
}

/** UTC instants for the start/end of a calendar day in the display timezone. */
export function getCalendarDayUtcRange(
  dateParam: string,
  timezone: string,
): { start: Date; end: Date } {
  return {
    start: parseISO(
      localToUtc(dateParam, undefined, timezone, { isAllDay: true, isEnd: false }),
    ),
    end: parseISO(
      localToUtc(dateParam, undefined, timezone, { isAllDay: true, isEnd: true }),
    ),
  };
}

/** Today's calendar date (YYYY-MM-DD) in the display timezone. */
export function getTodayCalendarDate(timezone: string): string {
  return formatInTimeZone(new Date(), timezone, "yyyy-MM-dd");
}

/** Add calendar days to a YYYY-MM-DD param in the display timezone. */
export function addCalendarDays(
  dateParam: string,
  delta: number,
  timezone: string,
): string {
  const anchor = parseCalendarDateParam(dateParam, timezone);
  return formatCalendarDate(addDays(anchor, delta), timezone);
}

export type CalendarDateShiftUnit = "day" | "week" | "month" | "year";

/** Shift a calendar date param by unit in the display timezone. */
export function shiftCalendarDateParam(
  dateParam: string,
  unit: CalendarDateShiftUnit,
  delta: number,
  timezone: string,
): string {
  const anchor = parseCalendarDateParam(dateParam, timezone);
  let next: Date;

  switch (unit) {
    case "day":
      next = addDays(anchor, delta);
      break;
    case "week":
      next = addWeeks(anchor, delta);
      break;
    case "month":
      next = addMonths(anchor, delta);
      break;
    case "year":
      next = addYears(anchor, delta);
      break;
  }

  return formatCalendarDate(next, timezone);
}

/** Build a path with ?date=YYYY-MM-DD. */
export function withCalendarDateParam(path: string, dateParam: string): string {
  return `${path}?date=${dateParam}`;
}

/** Sun–Sat calendar date params for the week containing the anchor date. */
export function getWeekCalendarDateParams(
  dateParam: string,
  timezone: string,
): string[] {
  const anchor = parseCalendarDateParam(dateParam, timezone);
  const isoDow = Number(formatInTimeZone(anchor, timezone, "i"));
  const daysFromSunday = isoDow % 7;

  return Array.from({ length: 7 }, (_, index) =>
    addCalendarDays(dateParam, -daysFromSunday + index, timezone),
  );
}

/** Resolve optional ?date= param to a canonical calendar date string and Date anchor. */
export function resolveCalendarDateParam(
  value: string | undefined,
  timezone: string,
): { dateParam: string; selectedDate: Date } {
  const dateParam =
    value && DATE_PATTERN.test(value) ? value : getTodayCalendarDate(timezone);
  return {
    dateParam,
    selectedDate: parseCalendarDateParam(dateParam, timezone),
  };
}
