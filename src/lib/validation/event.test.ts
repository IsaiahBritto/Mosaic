import { describe, expect, it } from "vitest";
import { eventFormSchema } from "@/lib/validation/event";

const validBase = {
  title: "Meeting",
  calendarId: "550e8400-e29b-41d4-a716-446655440000",
  isAllDay: false,
  startDate: "2026-06-01",
  endDate: "2026-06-01",
  startTime: "09:00",
  endTime: "10:00",
  timezone: "America/New_York",
  travelBeforeMinutes: 15,
  travelAfterMinutes: 30,
  isHoliday: false,
  recurrence: null,
};

describe("eventFormSchema", () => {
  it("accepts valid timed event", () => {
    const result = eventFormSchema.safeParse(validBase);
    expect(result.success).toBe(true);
  });

  it("rejects end before start", () => {
    const result = eventFormSchema.safeParse({
      ...validBase,
      startTime: "14:00",
      endTime: "13:00",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("endDate"))).toBe(
        true,
      );
    }
  });

  it("requires weekly days of week", () => {
    const result = eventFormSchema.safeParse({
      ...validBase,
      recurrence: {
        frequency: "weekly" as const,
        intervalCount: 1,
        daysOfWeek: [],
        endDate: null,
      },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) =>
          i.path.includes("recurrence") && i.path.includes("daysOfWeek"),
        ),
      ).toBe(true);
    }
  });

  it("accepts all-day event without times", () => {
    const result = eventFormSchema.safeParse({
      ...validBase,
      isAllDay: true,
      startTime: undefined,
      endTime: undefined,
    });

    expect(result.success).toBe(true);
  });
});
