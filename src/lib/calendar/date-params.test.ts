import { describe, expect, it } from "vitest";
import {
  formatDateParam,
  parseDateParam,
  shiftDate,
  withDateParam,
} from "./date-params";

describe("parseDateParam", () => {
  it("parses valid YYYY-MM-DD", () => {
    const date = parseDateParam("2026-08-21");
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(7);
    expect(date.getDate()).toBe(21);
  });

  it("falls back to today for invalid input", () => {
    const today = new Date();
    const date = parseDateParam("not-a-date");
    expect(date.getDate()).toBe(today.getDate());
  });
});

describe("formatDateParam", () => {
  it("formats as YYYY-MM-DD", () => {
    expect(formatDateParam(new Date(2026, 7, 21))).toBe("2026-08-21");
  });
});

describe("shiftDate", () => {
  it("shifts by day", () => {
    const base = new Date(2026, 7, 21);
    const next = shiftDate(base, "day", 1);
    expect(formatDateParam(next)).toBe("2026-08-22");
  });

  it("shifts by month", () => {
    const base = new Date(2026, 7, 21);
    const next = shiftDate(base, "month", 1);
    expect(formatDateParam(next)).toBe("2026-09-21");
  });
});

describe("withDateParam", () => {
  it("builds path with date query", () => {
    expect(withDateParam("/day", new Date(2026, 7, 21))).toBe(
      "/day?date=2026-08-21",
    );
  });
});
