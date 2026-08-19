import { endOfDay, parseISO } from "date-fns";
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
