import { z } from "zod";
import { buildEventTimestamps, isEndBeforeStart } from "@/lib/calendar/timezone";

const isoDateTime = z.string().datetime({ offset: true });

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date");
const timeString = z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time");

export const recurrenceRuleSchema = z.object({
  frequency: z.enum(["daily", "weekly", "monthly", "yearly"]),
  intervalCount: z.number().int().min(1).max(99),
  daysOfWeek: z.array(z.number().int().min(0).max(6)),
  endDate: dateString.nullable(),
});

export const eventFormSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(200),
    location: z.string().trim().max(200).optional(),
    notes: z.string().trim().max(5000).optional(),
    calendarId: z.string().uuid(),
    isAllDay: z.boolean(),
    startDate: dateString,
    endDate: dateString,
    startTime: timeString.optional(),
    endTime: timeString.optional(),
    timezone: z.string().min(1),
    travelBeforeMinutes: z.number().int().min(0).max(480),
    travelAfterMinutes: z.number().int().min(0).max(480),
    isHoliday: z.boolean(),
    recurrence: recurrenceRuleSchema.nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.isAllDay) {
      if (!data.startTime) {
        ctx.addIssue({
          code: "custom",
          message: "Start time is required",
          path: ["startTime"],
        });
      }
      if (!data.endTime) {
        ctx.addIssue({
          code: "custom",
          message: "End time is required",
          path: ["endTime"],
        });
      }
    }

    if (data.recurrence?.frequency === "weekly" && data.recurrence.daysOfWeek.length === 0) {
      ctx.addIssue({
        code: "custom",
        message: "Select at least one day for weekly recurrence",
        path: ["recurrence", "daysOfWeek"],
      });
    }

    try {
      const { startAt, endAt } = buildEventTimestamps({
        startDate: data.startDate,
        endDate: data.endDate,
        startTime: data.startTime,
        endTime: data.endTime,
        timezone: data.timezone,
        isAllDay: data.isAllDay,
      });

      if (isEndBeforeStart(startAt, endAt)) {
        ctx.addIssue({
          code: "custom",
          message: "End must be on or after start",
          path: ["endDate"],
        });
      }
    } catch {
      ctx.addIssue({
        code: "custom",
        message: "Invalid date or timezone",
        path: ["timezone"],
      });
    }
  });

export type EventFormInput = z.infer<typeof eventFormSchema>;

export const deleteEventSchema = z.object({
  id: z.string().uuid(),
});

export const rescheduleEventSchema = z
  .object({
    eventId: z.string().uuid(),
    originalStartAt: isoDateTime,
    originalEndAt: isoDateTime,
    startAt: isoDateTime,
    endAt: isoDateTime,
    scope: z.enum(["single", "series"]),
    mode: z.enum(["move", "resizeStart", "resizeEnd"]).default("move"),
  })
  .superRefine((data, ctx) => {
    if (isEndBeforeStart(data.startAt, data.endAt)) {
      ctx.addIssue({
        code: "custom",
        message: "End must be after start",
        path: ["endAt"],
      });
    }

    const durationMs =
      new Date(data.endAt).getTime() - new Date(data.startAt).getTime();
    if (durationMs < 15 * 60 * 1000) {
      ctx.addIssue({
        code: "custom",
        message: "Event must be at least 15 minutes",
        path: ["endAt"],
      });
    }
  });

export type RescheduleEventInput = z.infer<typeof rescheduleEventSchema>;
