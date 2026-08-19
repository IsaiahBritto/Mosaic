import { describe, expect, it } from "vitest";
import { parseISO } from "date-fns";
import {
  buildYearMosaicDays,
  getDayMosaicColors,
} from "@/lib/calendar/mosaic";
import type { EventInstance } from "@/types/event";

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

describe("getDayMosaicColors", () => {
  const tz = "America/New_York";
  const date = parseISO("2026-06-15T12:00:00.000Z");

  it("returns empty array when no events", () => {
    expect(getDayMosaicColors(date, [], tz)).toEqual([]);
  });

  it("returns unique calendar colors ordered by earliest event start", () => {
    const events = [
      baseEvent({
        instanceId: "evt-1",
        calendarColor: "#9379E0",
        startAt: "2026-06-15T13:00:00.000Z",
        endAt: "2026-06-15T14:00:00.000Z",
      }),
      baseEvent({
        instanceId: "evt-2",
        calendarId: "cal-2",
        calendarColor: "#00B2F6",
        startAt: "2026-06-15T18:00:00.000Z",
        endAt: "2026-06-15T19:00:00.000Z",
      }),
      baseEvent({
        instanceId: "evt-3",
        calendarId: "cal-3",
        calendarColor: "#FA7C69",
        startAt: "2026-06-15T14:00:00.000Z",
        endAt: "2026-06-15T15:00:00.000Z",
      }),
    ];

    expect(getDayMosaicColors(date, events, tz)).toEqual([
      "#9379E0",
      "#FA7C69",
      "#00B2F6",
    ]);
  });

  it("deduplicates multiple events on the same calendar", () => {
    const events = [
      baseEvent({ instanceId: "evt-1" }),
      baseEvent({
        instanceId: "evt-2",
        startAt: "2026-06-15T16:00:00.000Z",
        endAt: "2026-06-15T17:00:00.000Z",
      }),
    ];

    expect(getDayMosaicColors(date, events, tz)).toEqual(["#9379E0"]);
  });
});

describe("buildYearMosaicDays", () => {
  const tz = "America/New_York";

  it("returns 365 days for a non-leap year", () => {
    const days = buildYearMosaicDays(2025, [], tz);
    expect(days).toHaveLength(365);
    expect(days[0]?.date).toBe("2025-01-01");
    expect(days[364]?.date).toBe("2025-12-31");
  });

  it("returns 366 days for a leap year", () => {
    const days = buildYearMosaicDays(2024, [], tz);
    expect(days).toHaveLength(366);
    expect(days[365]?.date).toBe("2024-12-31");
  });

  it("includes colors for days with events", () => {
    const events = [
      baseEvent({
        startAt: "2026-03-10T13:00:00.000Z",
        endAt: "2026-03-10T14:00:00.000Z",
      }),
    ];
    const days = buildYearMosaicDays(2026, events, tz);
    const march10 = days.find((day) => day.date === "2026-03-10");

    expect(march10?.colors).toEqual(["#9379E0"]);
  });
});
