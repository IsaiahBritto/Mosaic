import { addMinutes, parseISO } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import {
  MIN_EVENT_HEIGHT_PX,
  PX_PER_HOUR,
  TIMELINE_DAY_END_HOUR,
  TIMELINE_DAY_START_HOUR,
  TIMELINE_EDGE_PADDING_PX,
  TIMELINE_TOTAL_HOURS,
} from "@/lib/calendar/constants";
import { formatEventTime } from "@/lib/calendar/timezone";
import { getEventSegmentForDay } from "@/lib/calendar/event-segments";
import type { EventInstance } from "@/types/event";

export const SNAP_INTERVAL_MINUTES = 15;
export const MIN_EVENT_DURATION_MINUTES = 15;

export type EventPosition = {
  top: number;
  height: number;
  startLabel: string;
  endLabel: string;
  travelBeforeHeight: number;
  travelAfterHeight: number;
};

export type EventDisplayData = {
  id: string;
  masterEventId: string;
  title: string;
  location: string | null;
  calendarColor: string;
  startAt: string;
  endAt: string;
  isAllDay: boolean;
  travelBeforeMinutes: number;
  travelAfterMinutes: number;
};

export function toEventDisplayData(event: EventInstance): EventDisplayData {
  return {
    id: event.instanceId,
    masterEventId: event.masterEventId,
    title: event.title,
    location: event.location,
    calendarColor: event.calendarColor,
    startAt: event.startAt,
    endAt: event.endAt,
    isAllDay: event.isAllDay,
    travelBeforeMinutes: event.travelBeforeMinutes,
    travelAfterMinutes: event.travelAfterMinutes,
  };
}

export function minutesFromTimelineStart(iso: string, timezone: string): number {
  const hours = Number(formatInTimeZone(iso, timezone, "H"));
  const minutes = Number(formatInTimeZone(iso, timezone, "m"));
  return (hours - TIMELINE_DAY_START_HOUR) * 60 + minutes;
}

export function clampTimelineMinutes(minutes: number): number {
  return Math.max(0, Math.min(TIMELINE_TOTAL_HOURS * 60, minutes));
}

export function pxToSnappedMinutes(yPx: number): number {
  const raw = ((yPx - TIMELINE_EDGE_PADDING_PX) / PX_PER_HOUR) * 60;
  return clampTimelineMinutes(
    Math.round(raw / SNAP_INTERVAL_MINUTES) * SNAP_INTERVAL_MINUTES,
  );
}

export function snappedMinutesToPx(minutes: number): number {
  return TIMELINE_EDGE_PADDING_PX + (minutes / 60) * PX_PER_HOUR;
}

export function hourIndexToPx(index: number): number {
  return TIMELINE_EDGE_PADDING_PX + index * PX_PER_HOUR;
}

export function timelineMinutesToIso(
  dayDate: Date,
  timelineMinutes: number,
  timezone: string,
): string {
  const totalMinutes = TIMELINE_DAY_START_HOUR * 60 + timelineMinutes;
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const dateStr = formatInTimeZone(dayDate, timezone, "yyyy-MM-dd");
  const time = `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}:00`;
  return fromZonedTime(`${dateStr}T${time}`, timezone).toISOString();
}

export function applyMinutesDeltaToEvent(
  startAt: string,
  endAt: string,
  deltaMinutes: number,
  mode: "move" | "resizeStart" | "resizeEnd",
): { startAt: string; endAt: string } {
  const start = parseISO(startAt);
  const end = parseISO(endAt);
  const minDurationMs = MIN_EVENT_DURATION_MINUTES * 60 * 1000;

  if (mode === "move") {
    return {
      startAt: addMinutes(start, deltaMinutes).toISOString(),
      endAt: addMinutes(end, deltaMinutes).toISOString(),
    };
  }

  if (mode === "resizeStart") {
    const newStart = addMinutes(start, deltaMinutes);
    if (end.getTime() - newStart.getTime() < minDurationMs) {
      return {
        startAt: addMinutes(end, -MIN_EVENT_DURATION_MINUTES).toISOString(),
        endAt: end.toISOString(),
      };
    }
    return { startAt: newStart.toISOString(), endAt: end.toISOString() };
  }

  const newEnd = addMinutes(end, deltaMinutes);
  if (newEnd.getTime() - start.getTime() < minDurationMs) {
    return {
      startAt: start.toISOString(),
      endAt: addMinutes(start, MIN_EVENT_DURATION_MINUTES).toISOString(),
    };
  }
  return { startAt: start.toISOString(), endAt: newEnd.toISOString() };
}

export function eventToPosition(
  event: EventInstance,
  displayTimezone: string,
  dateParam: string,
): EventPosition {
  const segment = getEventSegmentForDay(event, dateParam, displayTimezone);

  if (!segment) {
    return {
      top: 0,
      height: 0,
      startLabel: "",
      endLabel: "",
      travelBeforeHeight: 0,
      travelAfterHeight: 0,
    };
  }

  if (event.isAllDay) {
    return {
      top: 0,
      height: PX_PER_HOUR * 2,
      startLabel: "All day",
      endLabel: "All day",
      travelBeforeHeight: 0,
      travelAfterHeight: 0,
    };
  }

  const startMinutes = Math.max(
    0,
    minutesFromTimelineStart(segment.segmentStartAt, displayTimezone),
  );
  const endMinutes = Math.max(
    startMinutes + MIN_EVENT_DURATION_MINUTES,
    minutesFromTimelineStart(segment.segmentEndAt, displayTimezone),
  );

  const travelBeforeHeight =
    dateParam === dateParamFromIso(event.startAt, displayTimezone)
      ? (event.travelBeforeMinutes / 60) * PX_PER_HOUR
      : 0;
  const travelAfterHeight =
    dateParam === dateParamFromIso(event.endAt, displayTimezone)
      ? (event.travelAfterMinutes / 60) * PX_PER_HOUR
      : 0;
  const top =
    TIMELINE_EDGE_PADDING_PX +
    (startMinutes / 60) * PX_PER_HOUR -
    travelBeforeHeight;
  const height = Math.max(
    MIN_EVENT_HEIGHT_PX,
    ((endMinutes - startMinutes) / 60) * PX_PER_HOUR +
      travelBeforeHeight +
      travelAfterHeight,
  );

  return {
    top: Math.max(0, top),
    height,
    startLabel: formatEventTime(segment.segmentStartAt, displayTimezone, segment.isAllDaySegment),
    endLabel: formatEventTime(segment.segmentEndAt, displayTimezone, segment.isAllDaySegment),
    travelBeforeHeight,
    travelAfterHeight,
  };
}

function dateParamFromIso(iso: string, timezone: string): string {
  return formatInTimeZone(parseISO(iso), timezone, "yyyy-MM-dd");
}

export function slotToStartTime(
  yPx: number,
  timezone: string,
  dayDate: Date,
): string {
  const snapped = pxToSnappedMinutes(yPx);
  return timelineMinutesToIso(dayDate, snapped, timezone);
}

export function getTimelineHours(): number[] {
  return Array.from(
    { length: TIMELINE_DAY_END_HOUR - TIMELINE_DAY_START_HOUR + 1 },
    (_, index) => TIMELINE_DAY_START_HOUR + index,
  );
}

export function formatHourLabel(hour: number): string {
  const period = hour >= 12 ? "PM" : "AM";
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display}:00 ${period}`;
}

export function addTravelPadding(startAt: string, minutes: number): string {
  return addMinutes(parseISO(startAt), -minutes).toISOString();
}

export function positionFromMinutes(
  startMinutes: number,
  endMinutes: number,
  travelBeforeMinutes: number,
  travelAfterMinutes: number,
  displayTimezone: string,
  startAt: string,
  endAt: string,
): Pick<
  EventPosition,
  "top" | "height" | "startLabel" | "endLabel" | "travelBeforeHeight" | "travelAfterHeight"
> {
  const travelBeforeHeight = (travelBeforeMinutes / 60) * PX_PER_HOUR;
  const travelAfterHeight = (travelAfterMinutes / 60) * PX_PER_HOUR;
  const top =
    TIMELINE_EDGE_PADDING_PX +
    (startMinutes / 60) * PX_PER_HOUR -
    travelBeforeHeight;
  const height = Math.max(
    MIN_EVENT_HEIGHT_PX,
    ((endMinutes - startMinutes) / 60) * PX_PER_HOUR +
      travelBeforeHeight +
      travelAfterHeight,
  );

  return {
    top: Math.max(0, top),
    height,
    startLabel: formatEventTime(startAt, displayTimezone, false),
    endLabel: formatEventTime(endAt, displayTimezone, false),
    travelBeforeHeight,
    travelAfterHeight,
  };
}
