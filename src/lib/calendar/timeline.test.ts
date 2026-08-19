import { describe, expect, it } from "vitest";
import { eventToPosition } from "@/lib/calendar/timeline";
import type { EventInstance } from "@/types/event";

const event: EventInstance = {
  id: "evt-1",
  instanceId: "evt-1",
  masterEventId: "evt-1",
  calendarId: "cal-1",
  calendarColor: "#9379E0",
  calendarName: "Personal",
  title: "Meeting",
  location: "Office",
  notes: null,
  startAt: "2026-06-15T14:00:00.000Z",
  endAt: "2026-06-15T15:00:00.000Z",
  isAllDay: false,
  timezone: "America/New_York",
  travelBeforeMinutes: 30,
  travelAfterMinutes: 15,
  isHoliday: false,
  recurrence: null,
};

describe("eventToPosition", () => {
  it("returns positive top and height for timed events", () => {
    const position = eventToPosition(event, "America/New_York");
    expect(position.top).toBeGreaterThanOrEqual(0);
    expect(position.height).toBeGreaterThan(0);
    expect(position.startLabel).toBeTruthy();
    expect(position.endLabel).toBeTruthy();
  });

  it("includes travel padding in height", () => {
    const position = eventToPosition(event, "America/New_York");
    expect(position.travelBeforeHeight).toBeGreaterThan(0);
    expect(position.travelAfterHeight).toBeGreaterThan(0);
  });

  it("handles all-day events", () => {
    const position = eventToPosition(
      { ...event, isAllDay: true },
      "America/New_York",
    );
    expect(position.startLabel).toBe("All day");
  });
});
