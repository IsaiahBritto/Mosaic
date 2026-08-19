import { addMinutes, parseISO } from "date-fns";
import { formatInTimeZone, toZonedTime } from "date-fns-tz";
import {
  MIN_EVENT_HEIGHT_PX,
  PX_PER_HOUR,
  TIMELINE_DAY_END_HOUR,
  TIMELINE_DAY_START_HOUR,
} from "@/lib/calendar/constants";
import { formatEventTime } from "@/lib/calendar/timezone";
import type { EventInstance } from "@/types/event";

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

function minutesFromTimelineStart(date: Date, timezone: string): number {
  const local = toZonedTime(date, timezone);
  const hours = local.getHours();
  const minutes = local.getMinutes();
  return (hours - TIMELINE_DAY_START_HOUR) * 60 + minutes;
}

export function eventToPosition(
  event: EventInstance,
  timezone: string,
): EventPosition {
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

  const start = parseISO(event.startAt);
  const end = parseISO(event.endAt);
  const startMinutes = Math.max(
    0,
    minutesFromTimelineStart(start, timezone),
  );
  const endMinutes = Math.max(
    startMinutes + 30,
    minutesFromTimelineStart(end, timezone),
  );

  const travelBeforeHeight = (event.travelBeforeMinutes / 60) * PX_PER_HOUR;
  const travelAfterHeight = (event.travelAfterMinutes / 60) * PX_PER_HOUR;
  const top = (startMinutes / 60) * PX_PER_HOUR - travelBeforeHeight;
  const height = Math.max(
    MIN_EVENT_HEIGHT_PX,
    ((endMinutes - startMinutes) / 60) * PX_PER_HOUR +
      travelBeforeHeight +
      travelAfterHeight,
  );

  return {
    top: Math.max(0, top),
    height,
    startLabel: formatEventTime(event.startAt, timezone, false),
    endLabel: formatEventTime(event.endAt, timezone, false),
    travelBeforeHeight,
    travelAfterHeight,
  };
}

export function slotToStartTime(
  yPx: number,
  timezone: string,
  dayDate: Date,
): string {
  const totalMinutes =
    (yPx / PX_PER_HOUR) * 60 + TIMELINE_DAY_START_HOUR * 60;
  const rounded = Math.round(totalMinutes / 30) * 30;
  const hours = Math.floor(rounded / 60);
  const minutes = rounded % 60;
  const dateStr = formatInTimeZone(dayDate, timezone, "yyyy-MM-dd");
  const time = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  return `${dateStr}T${time}`;
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
