import { describe, expect, it } from "vitest";
import { parseISO } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { expandRecurrence } from "@/lib/calendar/recurrence";
import {
  getCalendarDayOfWeek,
  getCalendarDayUtcRange,
} from "@/lib/calendar/timezone";
import type { Event, RecurrenceRule } from "@/types/event";

const TZ = "America/New_York";

const baseEvent = (overrides: Partial<Event> = {}): Event => ({
  id: "evt-1",
  calendarId: "cal-1",
  calendarColor: "#9379E0",
  calendarName: "Personal",
  title: "Test Event",
  location: null,
  notes: null,
  startAt: "2026-01-06T14:00:00.000Z",
  endAt: "2026-01-06T15:00:00.000Z",
  isAllDay: false,
  timezone: TZ,
  travelBeforeMinutes: 0,
  travelAfterMinutes: 0,
  isHoliday: false,
  recurrence: null,
  ...overrides,
});

function instanceDatesInTz(
  instances: { startAt: string }[],
  timezone: string,
): string[] {
  return instances.map((instance) =>
    formatInTimeZone(instance.startAt, timezone, "yyyy-MM-dd"),
  );
}

describe("expandRecurrence", () => {
  it("expands daily recurrence with interval", () => {
    const master = baseEvent({
      startAt: "2026-01-01T10:00:00.000Z",
      endAt: "2026-01-01T11:00:00.000Z",
    });
    const rule: RecurrenceRule = {
      frequency: "daily",
      intervalCount: 2,
      daysOfWeek: [],
      endDate: null,
    };

    const instances = expandRecurrence(
      master,
      rule,
      parseISO("2026-01-01T00:00:00.000Z"),
      parseISO("2026-01-07T23:59:59.999Z"),
    );

    expect(instances).toHaveLength(4);
    expect(instanceDatesInTz(instances, TZ)).toEqual([
      "2026-01-01",
      "2026-01-03",
      "2026-01-05",
      "2026-01-07",
    ]);
  });

  it("expands weekly recurrence on selected days in event timezone", () => {
    const master = baseEvent({
      startAt: "2026-01-07T15:00:00.000Z",
      endAt: "2026-01-07T16:00:00.000Z",
    });
    const rule: RecurrenceRule = {
      frequency: "weekly",
      intervalCount: 1,
      daysOfWeek: [1, 3],
      endDate: null,
    };

    const instances = expandRecurrence(
      master,
      rule,
      parseISO("2026-01-05T00:00:00.000Z"),
      parseISO("2026-01-21T23:59:59.999Z"),
    );

    const days = instanceDatesInTz(instances, TZ).map((date) =>
      getCalendarDayOfWeek(date, TZ),
    );
    expect(days.every((d) => d === 1 || d === 3)).toBe(true);
    expect(instances.length).toBeGreaterThan(2);
  });

  it("expands Mon-Fri weekly recurrence in Chicago timezone on UTC range bounds", () => {
    const chicago = "America/Chicago";
    const master = baseEvent({
      timezone: chicago,
      title: "Work",
      startAt: "2026-08-17T13:00:00.000Z",
      endAt: "2026-08-17T22:00:00.000Z",
    });
    const rule: RecurrenceRule = {
      frequency: "weekly",
      intervalCount: 1,
      daysOfWeek: [1, 2, 3, 4, 5],
      endDate: null,
    };

    const { start: rangeStart } = getCalendarDayUtcRange("2026-08-16", chicago);
    const { end: rangeEnd } = getCalendarDayUtcRange("2026-08-22", chicago);

    const instances = expandRecurrence(master, rule, rangeStart, rangeEnd);
    const dates = instanceDatesInTz(instances, chicago);

    expect(dates).toEqual([
      "2026-08-17",
      "2026-08-18",
      "2026-08-19",
      "2026-08-20",
      "2026-08-21",
    ]);
    expect(dates.every((date) => getCalendarDayOfWeek(date, chicago) >= 1)).toBe(
      true,
    );
    expect(dates.every((date) => getCalendarDayOfWeek(date, chicago) <= 5)).toBe(
      true,
    );
  });

  it("stops at recurrence end date", () => {
    const master = baseEvent({
      startAt: "2026-01-01T10:00:00.000Z",
      endAt: "2026-01-01T11:00:00.000Z",
    });
    const rule: RecurrenceRule = {
      frequency: "daily",
      intervalCount: 1,
      daysOfWeek: [],
      endDate: "2026-01-03",
    };

    const instances = expandRecurrence(
      master,
      rule,
      parseISO("2026-01-01T00:00:00.000Z"),
      parseISO("2026-01-31T23:59:59.999Z"),
    );

    expect(instances).toHaveLength(3);
    expect(instanceDatesInTz(instances, TZ).at(-1)).toBe("2026-01-03");
  });

  it("uses virtual instance ids", () => {
    const master = baseEvent({
      startAt: "2026-01-01T10:00:00.000Z",
      endAt: "2026-01-01T11:00:00.000Z",
    });
    const rule: RecurrenceRule = {
      frequency: "daily",
      intervalCount: 1,
      daysOfWeek: [],
      endDate: null,
    };

    const [instance] = expandRecurrence(
      master,
      rule,
      parseISO("2026-01-01T00:00:00.000Z"),
      parseISO("2026-01-02T23:59:59.999Z"),
    );

    expect(instance.instanceId).toBe(`${master.id}_${instance.startAt}`);
    expect(instance.masterEventId).toBe(master.id);
  });
});
