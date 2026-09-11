import { z } from "zod";
import { CALENDAR_PALETTE } from "@/lib/theme/colors";

const paletteEnum = z.enum(
  CALENDAR_PALETTE as unknown as [string, ...string[]],
);

export const createCalendarSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(50),
  colorHex: paletteEnum,
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

const sidebarOrderNodeSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("calendar"),
    calendarId: z.string().uuid(),
  }),
  z.object({
    type: z.literal("connection"),
    connectionId: z.string().uuid(),
    calendarIds: z.array(z.string().uuid()),
  }),
]);

export const saveSidebarCalendarOrderSchema = z.object({
  items: z.array(sidebarOrderNodeSchema),
});

export const updateCalendarDisplaySchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(50).optional(),
  colorHex: paletteEnum.optional(),
  scope: z.enum(["global", "personal"]),
});

export const revertCalendarDisplaySchema = z.object({
  id: z.string().uuid(),
});

export type CreateCalendarInput = z.infer<typeof createCalendarSchema>;
export type UpdateCalendarInput = z.infer<typeof updateCalendarSchema>;
export type DeleteCalendarInput = z.infer<typeof deleteCalendarSchema>;
export type SaveSidebarCalendarOrderInput = z.infer<
  typeof saveSidebarCalendarOrderSchema
>;
