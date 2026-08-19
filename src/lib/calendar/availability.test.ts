import { describe, expect, it } from "vitest";
import { parseISO } from "date-fns";
import {
  computeDayAvailability,
  computeRangeAvailability,
} from "@/lib/calendar/availability";
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
});
