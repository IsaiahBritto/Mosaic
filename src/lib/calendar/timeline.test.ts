import { describe, expect, it } from "vitest";
import { PX_PER_HOUR, TIMELINE_DAY_START_HOUR, TIMELINE_EDGE_PADDING_PX } from "@/lib/calendar/constants";
import {
  applyMinutesDeltaToEvent,
  eventToPosition,
  getTimelineHours,
  minutesFromTimelineStart,
  pxToSnappedMinutes,
  snappedMinutesToPx,
} from "@/lib/calendar/timeline";
import type { EventInstance } from "@/types/event";

const baseEvent: EventInstance = {
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
    const position = eventToPosition(baseEvent, "America/New_York");
    expect(position.top).toBeGreaterThanOrEqual(0);
    expect(position.height).toBeGreaterThan(0);
    expect(position.startLabel).toBeTruthy();
    expect(position.endLabel).toBeTruthy();
  });

  it("includes travel padding in height", () => {
    const position = eventToPosition(baseEvent, "America/New_York");
    expect(position.travelBeforeHeight).toBeGreaterThan(0);
    expect(position.travelAfterHeight).toBeGreaterThan(0);
  });

  it("handles all-day events", () => {
    const position = eventToPosition(
      { ...baseEvent, isAllDay: true },
      "America/New_York",
    );
    expect(position.startLabel).toBe("All day");
  });

  it("positions 8am Chicago event at 8am row when display timezone is Chicago", () => {
    const chicagoEvent: EventInstance = {
      ...baseEvent,
      startAt: "2026-06-15T13:00:00.000Z",
      endAt: "2026-06-15T23:00:00.000Z",
      timezone: "America/Chicago",
    };

    const position = eventToPosition(chicagoEvent, "America/Chicago");
    const expectedTop =
      TIMELINE_EDGE_PADDING_PX +
      ((8 - TIMELINE_DAY_START_HOUR) * 60) / 60 * PX_PER_HOUR -
      chicagoEvent.travelBeforeMinutes / 60 * PX_PER_HOUR;

    expect(position.top).toBe(expectedTop);
  });

  it("positions 8am Chicago event at 9am row when display timezone is Eastern", () => {
    const chicagoEvent: EventInstance = {
      ...baseEvent,
      startAt: "2026-06-15T13:00:00.000Z",
      endAt: "2026-06-15T23:00:00.000Z",
      timezone: "America/Chicago",
    };

    const position = eventToPosition(chicagoEvent, "America/New_York");
    const expectedTop =
      TIMELINE_EDGE_PADDING_PX +
      ((9 - TIMELINE_DAY_START_HOUR) * 60) / 60 * PX_PER_HOUR -
      chicagoEvent.travelBeforeMinutes / 60 * PX_PER_HOUR;

    expect(position.top).toBe(expectedTop);
  });
});

describe("getTimelineHours", () => {
  it("returns all 24 hours from midnight through 11 PM", () => {
    expect(getTimelineHours()).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
      20, 21, 22, 23,
    ]);
  });
});

describe("minutesFromTimelineStart", () => {
  it("returns timeline-relative minutes for Chicago 8am", () => {
    const minutes = minutesFromTimelineStart(
      "2026-06-15T13:00:00.000Z",
      "America/Chicago",
    );
    expect(minutes).toBe((8 - TIMELINE_DAY_START_HOUR) * 60);
  });
});

describe("snap helpers", () => {
  it("rounds y position to nearest 15 minutes from timeline start", () => {
    expect(pxToSnappedMinutes(TIMELINE_EDGE_PADDING_PX)).toBe(0);
    expect(pxToSnappedMinutes(TIMELINE_EDGE_PADDING_PX + PX_PER_HOUR / 4)).toBe(15);
    expect(pxToSnappedMinutes(TIMELINE_EDGE_PADDING_PX + PX_PER_HOUR / 2)).toBe(30);
  });

  it("converts snapped minutes back to pixels", () => {
    expect(snappedMinutesToPx(60)).toBe(TIMELINE_EDGE_PADDING_PX + PX_PER_HOUR);
    expect(snappedMinutesToPx(15)).toBe(TIMELINE_EDGE_PADDING_PX + PX_PER_HOUR / 4);
  });
});

describe("applyMinutesDeltaToEvent", () => {
  it("preserves duration when moving", () => {
    const result = applyMinutesDeltaToEvent(
      "2026-06-15T14:00:00.000Z",
      "2026-06-15T15:00:00.000Z",
      30,
      "move",
    );

    const duration =
      new Date(result.endAt).getTime() - new Date(result.startAt).getTime();
    expect(duration).toBe(60 * 60 * 1000);
  });

  it("enforces minimum duration when resizing start", () => {
    const result = applyMinutesDeltaToEvent(
      "2026-06-15T14:00:00.000Z",
      "2026-06-15T15:00:00.000Z",
      50,
      "resizeStart",
    );

    const duration =
      new Date(result.endAt).getTime() - new Date(result.startAt).getTime();
    expect(duration).toBeGreaterThanOrEqual(15 * 60 * 1000);
  });

  it("enforces minimum duration when resizing end", () => {
    const result = applyMinutesDeltaToEvent(
      "2026-06-15T14:00:00.000Z",
      "2026-06-15T15:00:00.000Z",
      -50,
      "resizeEnd",
    );

    const duration =
      new Date(result.endAt).getTime() - new Date(result.startAt).getTime();
    expect(duration).toBeGreaterThanOrEqual(15 * 60 * 1000);
  });
});
