import { describe, expect, it } from "vitest";
import { parseISO } from "date-fns";
import {
  formatCalendarDate,
  getCalendarDayUtcRange,
  getTodayCalendarDate,
  parseCalendarDateParam,
  resolveCalendarDateParam,
} from "@/lib/calendar/timezone";

const TZ = "America/Chicago";

describe("formatCalendarDate", () => {
  it("formats UTC instant as calendar date in display timezone", () => {
    const instant = parseISO("2026-01-27T06:00:00.000Z");
    expect(formatCalendarDate(instant, TZ)).toBe("2026-01-27");
  });

  it("shifts calendar date near UTC midnight boundaries", () => {
    const instant = parseISO("2026-01-27T05:00:00.000Z");
    expect(formatCalendarDate(instant, TZ)).toBe("2026-01-26");
  });
});

describe("getCalendarDayUtcRange", () => {
  it("includes an 8am Chicago event on 2026-01-27", () => {
    const { start, end } = getCalendarDayUtcRange("2026-01-27", TZ);
    const eventStart = parseISO("2026-01-27T14:00:00.000Z");
    expect(eventStart.getTime()).toBeGreaterThanOrEqual(start.getTime());
    expect(eventStart.getTime()).toBeLessThanOrEqual(end.getTime());
  });

  it("excludes adjacent-day events outside the Chicago calendar day", () => {
    const { start, end } = getCalendarDayUtcRange("2026-01-27", TZ);
    const previousDayLate = parseISO("2026-01-27T05:59:00.000Z");
    const nextDayEarly = parseISO("2026-01-28T07:00:00.000Z");
    expect(previousDayLate.getTime()).toBeLessThan(start.getTime());
    expect(nextDayEarly.getTime()).toBeGreaterThan(end.getTime());
  });
});

describe("parseCalendarDateParam", () => {
  it("returns noon local as anchor for calendar date math", () => {
    const anchor = parseCalendarDateParam("2026-01-27", TZ);
    expect(formatCalendarDate(anchor, TZ)).toBe("2026-01-27");
  });
});

describe("resolveCalendarDateParam", () => {
  it("uses provided date param when valid", () => {
    const result = resolveCalendarDateParam("2026-01-27", TZ);
    expect(result.dateParam).toBe("2026-01-27");
    expect(formatCalendarDate(result.selectedDate, TZ)).toBe("2026-01-27");
  });

  it("falls back to today in display timezone when missing", () => {
    const result = resolveCalendarDateParam(undefined, TZ);
    expect(result.dateParam).toBe(getTodayCalendarDate(TZ));
  });
});
