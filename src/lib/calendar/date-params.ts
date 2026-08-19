import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  isValid,
  parseISO,
  startOfDay,
} from "date-fns";

const DATE_PARAM_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Parse ?date=YYYY-MM-DD from URL; falls back to today at start of day. */
export function parseDateParam(value?: string): Date {
  if (value && DATE_PARAM_PATTERN.test(value)) {
    const parsed = parseISO(value);
    if (isValid(parsed)) {
      return startOfDay(parsed);
    }
  }
  return startOfDay(new Date());
}

/** Format a Date as YYYY-MM-DD for URL search params. */
export function formatDateParam(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export type DateShiftUnit = "day" | "week" | "month" | "year";

/** Shift a date by unit and signed delta. */
export function shiftDate(
  date: Date,
  unit: DateShiftUnit,
  delta: number,
): Date {
  switch (unit) {
    case "day":
      return startOfDay(addDays(date, delta));
    case "week":
      return startOfDay(addWeeks(date, delta));
    case "month":
      return startOfDay(addMonths(date, delta));
    case "year":
      return startOfDay(addYears(date, delta));
    default: {
      const _exhaustive: never = unit;
      return _exhaustive;
    }
  }
}

/** Build a URL path preserving the date query param. */
export function withDateParam(path: string, date: Date): string {
  return `${path}?date=${formatDateParam(date)}`;
}

/** Sun–Sat dates for the week containing the given date. */
export function getWeekDates(date: Date): Date[] {
  const start = startOfDay(date);
  const dayOfWeek = start.getDay();
  const weekStart = addDays(start, -dayOfWeek);
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

export const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"] as const;
