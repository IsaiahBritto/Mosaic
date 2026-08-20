import { describe, expect, it } from "vitest";
import type { EventInstance } from "@/types/event";
import { getEventSegmentForDay } from "@/lib/calendar/event-segments";
import { formatInTimeZone } from "date-fns-tz";
import { parseISO } from "date-fns";

const TZ = "America/New_York";

const baseEvent: EventInstance = {
  id: "1",
  instanceId: "1",
  masterEventId: "1",
  calendarId: "cal-1",
  calendarColor: "#9379E0",
  calendarName: "Personal",
  title: "Conference",
  location: null,
  notes: null,
  startAt: "2026-08-18T13:00:00.000Z",
  endAt: "2026-08-22T14:00:00.000Z",
  isAllDay: false,
  timezone: TZ,
  travelBeforeMinutes: 0,
  travelAfterMinutes: 0,
  isHoliday: false,
  recurrence: null,
};

function segmentStartHour(dateParam: string, segment: ReturnType<typeof getEventSegmentForDay>) {
  if (!segment) return null;
  return Number(formatInTimeZone(parseISO(segment.segmentStartAt), TZ, "H"));
}

describe("getEventSegmentForDay", () => {
  it("returns timed start on first day of span", () => {
    const segment = getEventSegmentForDay(baseEvent, "2026-08-18", TZ);
    expect(segment).not.toBeNull();
    expect(segmentStartHour("2026-08-18", segment)).toBe(9);
  });

  it("returns all-day segment on middle days", () => {
    const segment = getEventSegmentForDay(baseEvent, "2026-08-20", TZ);
    expect(segment?.isAllDaySegment).toBe(true);
  });

  it("returns timed end on last day of span", () => {
    const segment = getEventSegmentForDay(baseEvent, "2026-08-22", TZ);
    expect(segment).not.toBeNull();
    expect(Number(formatInTimeZone(parseISO(segment!.segmentEndAt), TZ, "H"))).toBe(10);
  });
});
