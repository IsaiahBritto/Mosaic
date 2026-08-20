import { parseISO } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { WAKING_END_HOUR, WAKING_START_HOUR } from "@/lib/calendar/constants";
import {
  addCalendarDays,
  getCalendarDayUtcRange,
  parseCalendarDateParam,
} from "@/lib/calendar/timezone";
import type { EventInstance } from "@/types/event";

export type DayEventSegment = {
  segmentStartAt: string;
  segmentEndAt: string;
  isAllDaySegment: boolean;
};

function dateParamFromIso(iso: string, timezone: string): string {
  return formatInTimeZone(parseISO(iso), timezone, "yyyy-MM-dd");
}

function wakingBounds(dateParam: string, timezone: string): { start: Date; end: Date } {
  const start = fromZonedTime(
    `${dateParam}T${String(WAKING_START_HOUR).padStart(2, "0")}:00:00`,
    timezone,
  );
  const end =
    WAKING_END_HOUR >= 24
      ? fromZonedTime(`${addCalendarDays(dateParam, 1, timezone)}T00:00:00`, timezone)
      : fromZonedTime(
          `${dateParam}T${String(WAKING_END_HOUR).padStart(2, "0")}:00:00`,
          timezone,
        );
  return { start, end };
}

/** Display segment for a multi-day event on a specific calendar day. */
export function getEventSegmentForDay(
  event: EventInstance,
  dateParam: string,
  timezone: string,
): DayEventSegment | null {
  const { start: dayStart, end: dayEnd } = getCalendarDayUtcRange(dateParam, timezone);
  const eventStart = parseISO(event.startAt);
  const eventEnd = parseISO(event.endAt);

  if (eventEnd < dayStart || eventStart > dayEnd) {
    return null;
  }

  const startDate = dateParamFromIso(event.startAt, timezone);
  const endDate = dateParamFromIso(event.endAt, timezone);

  if (startDate === endDate) {
    return {
      segmentStartAt: event.startAt,
      segmentEndAt: event.endAt,
      isAllDaySegment: event.isAllDay,
    };
  }

  if (event.isAllDay) {
    return {
      segmentStartAt: dayStart.toISOString(),
      segmentEndAt: dayEnd.toISOString(),
      isAllDaySegment: true,
    };
  }

  if (dateParam === startDate) {
    return {
      segmentStartAt: event.startAt,
      segmentEndAt: dayEnd.toISOString(),
      isAllDaySegment: false,
    };
  }

  if (dateParam === endDate) {
    return {
      segmentStartAt: dayStart.toISOString(),
      segmentEndAt: event.endAt,
      isAllDaySegment: false,
    };
  }

  if (dateParam > startDate && dateParam < endDate) {
    const { start, end } = wakingBounds(dateParam, timezone);
    return {
      segmentStartAt: start.toISOString(),
      segmentEndAt: end.toISOString(),
      isAllDaySegment: true,
    };
  }

  return null;
}

export function getSegmentDisplayTimes(
  segment: DayEventSegment,
  timezone: string,
): { startAt: string; endAt: string; isAllDay: boolean } {
  return {
    startAt: segment.segmentStartAt,
    endAt: segment.segmentEndAt,
    isAllDay: segment.isAllDaySegment,
  };
}

export function isMultiDayEvent(event: EventInstance, timezone: string): boolean {
  const startDate = dateParamFromIso(event.startAt, timezone);
  const endDate = dateParamFromIso(event.endAt, timezone);
  return startDate !== endDate;
}

export function parseCalendarDateOnly(dateParam: string, timezone: string): Date {
  return parseCalendarDateParam(dateParam, timezone);
}
