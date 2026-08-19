import { z } from "zod";
import { CALENDAR_PALETTE } from "@/lib/theme/colors";

const paletteEnum = z.enum(
  CALENDAR_PALETTE as unknown as [string, ...string[]],
);

export const createCalendarSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(50),
  colorHex: paletteEnum,
  inviteEmail: z.union([z.string().email(), z.literal("")]).optional(),
});

export const updateCalendarSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(50).optional(),
  colorHex: paletteEnum.optional(),
});

export const deleteCalendarSchema = z.object({
  id: z.string().uuid(),
});

export const setCalendarVisibilitySchema = z.object({
  calendarId: z.string().uuid(),
  visible: z.boolean(),
});

export const setAllCalendarsVisibilitySchema = z.object({
  visible: z.boolean(),
});

export const saveCalendarPreferencesSchema = z.object({
  visibleIds: z.array(z.string().uuid()),
});

export type CreateCalendarInput = z.infer<typeof createCalendarSchema>;
export type UpdateCalendarInput = z.infer<typeof updateCalendarSchema>;
export type DeleteCalendarInput = z.infer<typeof deleteCalendarSchema>;
