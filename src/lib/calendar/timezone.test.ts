import { describe, expect, it } from "vitest";
import {
  buildEventTimestamps,
  formatEventTime,
  isEndBeforeStart,
  localToUtc,
  utcToLocal,
} from "@/lib/calendar/timezone";

describe("timezone utilities", () => {
  it("converts local timed event to UTC and back", () => {
    const tz = "America/New_York";
    const startAt = localToUtc("2026-06-15", "09:30", tz, {
      isAllDay: false,
    });
    const local = utcToLocal(startAt, tz);

    expect(local.date).toBe("2026-06-15");
    expect(local.time).toBe("09:30");
  });

  it("sets all-day boundaries in timezone", () => {
    const tz = "America/Los_Angeles";
    const { startAt, endAt } = buildEventTimestamps({
      startDate: "2026-03-01",
      endDate: "2026-03-01",
      timezone: tz,
      isAllDay: true,
    });

    const startLocal = utcToLocal(startAt, tz);
    const endLocal = utcToLocal(endAt, tz);

    expect(startLocal.time).toBe("00:00");
    expect(endLocal.time).toBe("23:59");
    expect(isEndBeforeStart(startAt, endAt)).toBe(false);
  });

  it("formats event time for display", () => {
    const formatted = formatEventTime(
      "2026-01-15T14:30:00.000Z",
      "UTC",
      false,
    );
    expect(formatted).toMatch(/02:30 PM/);
    expect(formatEventTime("2026-01-15T14:30:00.000Z", "UTC", true)).toBe(
      "All day",
    );
  });
});
