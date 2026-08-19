import { describe, expect, it } from "vitest";
import { parseISO } from "date-fns";
import {
  computeDayAvailability,
  computeRangeAvailability,
  getMonthGridDates,
  isDateInMonth,
} from "@/lib/calendar/availability";
import { expandRecurrence } from "@/lib/calendar/recurrence";
import {
  getCalendarDayOfWeek,
  getCalendarDayUtcRange,
} from "@/lib/calendar/timezone";
import type { Event, EventInstance } from "@/types/event";

const CHICAGO = "America/Chicago";

const workMaster: Event = {
  id: "evt-work",
  calendarId: "cal-1",
  calendarColor: "#9379E0",
  calendarName: "Work",
  title: "Work",
  location: "Home",
  notes: null,
  startAt: "2026-08-17T13:00:00.000Z",
  endAt: "2026-08-17T22:00:00.000Z",
  isAllDay: false,
  timezone: CHICAGO,
  travelBeforeMinutes: 0,
  travelAfterMinutes: 0,
  isHoliday: false,
  recurrence: {
    frequency: "weekly",
    intervalCount: 1,
    daysOfWeek: [1, 2, 3, 4, 5],
    endDate: null,
  },
};

const baseEvent = (overrides: Partial<EventInstance> = {}): EventInstance => ({
  id: "evt-1",
  instanceId: "evt-1",
  masterEventId: "evt-1",
  calendarId: "cal-1",
  calendarColor: "#9379E0",
  calendarName: "Personal",
  title: "Meeting",
  location: null,
  notes: null,
  startAt: "2026-06-15T13:00:00.000Z",
  endAt: "2026-06-15T14:00:00.000Z",
  isAllDay: false,
  timezone: "America/New_York",
  travelBeforeMinutes: 0,
  travelAfterMinutes: 0,
  isHoliday: false,
  recurrence: null,
  ...overrides,
});

describe("computeDayAvailability", () => {
  const tz = "America/New_York";
  const date = parseISO("2026-06-15T12:00:00.000Z");

  it("returns free when no events", () => {
    const result = computeDayAvailability(date, [], tz);
    expect(result.status).toBe("free");
  });

  it("returns holiday when event is marked holiday", () => {
    const result = computeDayAvailability(
      date,
      [baseEvent({ isHoliday: true })],
      tz,
    );
    expect(result.status).toBe("holiday");
  });

  it("returns busy for all-day event", () => {
    const result = computeDayAvailability(
      date,
      [baseEvent({ isAllDay: true })],
      tz,
    );
    expect(result.status).toBe("busy");
  });

  it("returns busy for three or more events", () => {
    const events = [
      baseEvent({ instanceId: "1", title: "A" }),
      baseEvent({ instanceId: "2", title: "B" }),
      baseEvent({ instanceId: "3", title: "C" }),
    ];
    const result = computeDayAvailability(date, events, tz);
    expect(result.status).toBe("busy");
  });

  it("returns partial for short timed event", () => {
    const result = computeDayAvailability(date, [baseEvent()], tz);
    expect(["partial", "busy"]).toContain(result.status);
  });
});

describe("computeRangeAvailability", () => {
  it("builds a map keyed by yyyy-MM-dd", () => {
    const start = parseISO("2026-06-01T12:00:00.000Z");
    const end = parseISO("2026-06-03T12:00:00.000Z");
    const map = computeRangeAvailability(start, end, [], "UTC");
    expect(map.size).toBeGreaterThanOrEqual(3);
    expect(map.has("2026-06-02")).toBe(true);
  });

  it("aligns Mon–Fri work events to correct calendar keys in Chicago TZ", () => {
    const tz = "America/Chicago";
    const workDays = ["2026-08-10", "2026-08-11", "2026-08-12", "2026-08-13", "2026-08-14"];
    const events: EventInstance[] = workDays.map((day, index) =>
      baseEvent({
        instanceId: `work-${index}`,
        masterEventId: `work-${index}`,
        title: "Work",
        startAt: `${day}T14:00:00.000Z`,
        endAt: `${day}T22:00:00.000Z`,
        timezone: tz,
      }),
    );

    const start = parseISO("2026-08-09T12:00:00.000Z");
    const end = parseISO("2026-08-16T12:00:00.000Z");
    const map = computeRangeAvailability(start, end, events, tz);

    for (const day of workDays) {
      expect(map.get(day)?.status).toBe("busy");
    }

    expect(map.get("2026-08-09")?.status).toBe("free");
    expect(map.get("2026-08-15")?.status).toBe("free");
  });

  it("aligns expanded Mon-Fri recurrence to week strip keys in Chicago TZ", () => {
    const tz = CHICAGO;
    const { start: rangeStart } = getCalendarDayUtcRange("2026-08-16", tz);
    const { end: rangeEnd } = getCalendarDayUtcRange("2026-08-22", tz);
    const events = expandRecurrence(
      workMaster,
      workMaster.recurrence!,
      rangeStart,
      rangeEnd,
    );
    const map = computeRangeAvailability(rangeStart, rangeEnd, events, tz);

    for (const day of ["2026-08-17", "2026-08-18", "2026-08-19", "2026-08-20", "2026-08-21"]) {
      expect(map.get(day)?.status).toBe("busy");
    }

    expect(map.get("2026-08-16")?.status).toBe("free");
    expect(map.get("2026-08-22")?.status).toBe("free");
  });
});

describe("getMonthGridDates", () => {
  it("builds a Sun-first 42 day grid around the month in display timezone", () => {
    const grid = getMonthGridDates("2026-08-19", CHICAGO);

    expect(grid).toHaveLength(42);
    expect(grid[0]).toBe("2026-07-26");
    expect(grid.at(-1)).toBe("2026-09-05");
    expect(grid).toContain("2026-08-01");
    expect(grid).toContain("2026-08-31");
  });

  it("starts every row boundary on a Sunday", () => {
    const grid = getMonthGridDates("2026-08-19", CHICAGO);

    for (let index = 0; index < grid.length; index += 7) {
      expect(getCalendarDayOfWeek(grid[index]!, CHICAGO)).toBe(0);
    }
  });

  it("ignores the day portion of the anchor param", () => {
    expect(getMonthGridDates("2026-08-01", CHICAGO)).toEqual(
      getMonthGridDates("2026-08-31", CHICAGO),
    );
  });
});

describe("isDateInMonth", () => {
  it("matches only dates within the anchor month", () => {
    expect(isDateInMonth("2026-08-01", "2026-08-19")).toBe(true);
    expect(isDateInMonth("2026-07-26", "2026-08-19")).toBe(false);
    expect(isDateInMonth("2026-09-05", "2026-08-19")).toBe(false);
  });
});

describe("month grid availability alignment", () => {
  it("colors only Mon-Fri cells for a Mon-Fri Chicago event", () => {
    const tz = CHICAGO;
    const grid = getMonthGridDates("2026-08-19", tz);
    const { start: rangeStart } = getCalendarDayUtcRange(grid[0]!, tz);
    const { end: rangeEnd } = getCalendarDayUtcRange(grid.at(-1)!, tz);
    const events = expandRecurrence(
      workMaster,
      workMaster.recurrence!,
      rangeStart,
      rangeEnd,
    );
    const map = computeRangeAvailability(rangeStart, rangeEnd, events, tz);

    for (const dateParam of grid) {
      if (dateParam < "2026-08-17") {
        continue;
      }

      const dayOfWeek = getCalendarDayOfWeek(dateParam, tz);
      const expected = dayOfWeek >= 1 && dayOfWeek <= 5 ? "busy" : "free";
      expect(map.get(dateParam)?.status).toBe(expected);
    }
  });
});
