import { describe, expect, it } from "vitest";
import { parseISO } from "date-fns";
import { expandRecurrence } from "@/lib/calendar/recurrence";
import type { Event, RecurrenceRule } from "@/types/event";

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
  timezone: "America/New_York",
  travelBeforeMinutes: 0,
  travelAfterMinutes: 0,
  isHoliday: false,
  recurrence: null,
  ...overrides,
});

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
    expect(instances.map((i) => i.startAt.slice(0, 10))).toEqual([
      "2026-01-01",
      "2026-01-03",
      "2026-01-05",
      "2026-01-07",
    ]);
  });

  it("expands weekly recurrence on selected days", () => {
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

    const days = instances.map((i) => parseISO(i.startAt).getDay());
    expect(days.every((d) => d === 1 || d === 3)).toBe(true);
    expect(instances.length).toBeGreaterThan(2);
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
    expect(instances.at(-1)?.startAt.slice(0, 10)).toBe("2026-01-03");
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
