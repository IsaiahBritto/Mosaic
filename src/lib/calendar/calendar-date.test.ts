import { describe, expect, it } from "vitest";
import { parseISO } from "date-fns";
import {
  addCalendarDays,
  formatCalendarDate,
  formatDayHeading,
  formatMonthYearHeading,
  formatOrdinalDay,
  formatYearHeading,
  getCalendarDayOfWeek,
  getCalendarDayUtcRange,
  getTodayCalendarDate,
  getWeekCalendarDateParams,
  parseCalendarDateParam,
  resolveCalendarDateParam,
  shiftCalendarDateParam,
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

describe("addCalendarDays", () => {
  it("adds days within the display timezone", () => {
    expect(addCalendarDays("2026-08-14", 1, TZ)).toBe("2026-08-15");
    expect(addCalendarDays("2026-08-14", -1, TZ)).toBe("2026-08-13");
  });
});

describe("shiftCalendarDateParam", () => {
  it("shifts by day, week, month, and year in display timezone", () => {
    expect(shiftCalendarDateParam("2026-08-14", "day", 1, TZ)).toBe("2026-08-15");
    expect(shiftCalendarDateParam("2026-08-14", "week", 1, TZ)).toBe("2026-08-21");
    expect(shiftCalendarDateParam("2026-08-14", "month", 1, TZ)).toBe("2026-09-14");
    expect(shiftCalendarDateParam("2026-08-14", "year", 1, TZ)).toBe("2027-08-14");
  });
});

describe("getWeekCalendarDateParams", () => {
  it("returns Sun–Sat for the week containing a Friday anchor", () => {
    const week = getWeekCalendarDateParams("2026-08-14", TZ);
    expect(week).toEqual([
      "2026-08-09",
      "2026-08-10",
      "2026-08-11",
      "2026-08-12",
      "2026-08-13",
      "2026-08-14",
      "2026-08-15",
    ]);
  });

  it("returns Sun–Sat for a Sunday anchor", () => {
    const week = getWeekCalendarDateParams("2026-08-09", TZ);
    expect(week[0]).toBe("2026-08-09");
    expect(week[6]).toBe("2026-08-15");
  });
});

describe("getCalendarDayOfWeek", () => {
  it("returns JS-style day of week in display timezone", () => {
    expect(getCalendarDayOfWeek("2026-08-16", TZ)).toBe(0);
    expect(getCalendarDayOfWeek("2026-08-17", TZ)).toBe(1);
    expect(getCalendarDayOfWeek("2026-08-21", TZ)).toBe(5);
    expect(getCalendarDayOfWeek("2026-08-22", TZ)).toBe(6);
  });
});

describe("formatOrdinalDay", () => {
  it("formats English ordinals", () => {
    expect(formatOrdinalDay(1)).toBe("1st");
    expect(formatOrdinalDay(2)).toBe("2nd");
    expect(formatOrdinalDay(3)).toBe("3rd");
    expect(formatOrdinalDay(4)).toBe("4th");
    expect(formatOrdinalDay(11)).toBe("11th");
    expect(formatOrdinalDay(21)).toBe("21st");
  });
});

describe("formatDayHeading", () => {
  it("returns weekday and ordinal date in display timezone", () => {
    expect(formatDayHeading("2026-08-19", TZ)).toBe("Wednesday the 19th");
  });
});

describe("formatMonthYearHeading", () => {
  it("returns uppercase month and year in display timezone", () => {
    expect(formatMonthYearHeading("2026-08-19", TZ)).toBe("AUGUST 2026");
  });
});

describe("formatYearHeading", () => {
  it("returns the year from a calendar date param", () => {
    expect(formatYearHeading("2026-08-19")).toBe("2026");
  });
});
