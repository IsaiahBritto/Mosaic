import { z } from "zod";

export const inviteToCalendarSchema = z.object({
  calendarId: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(["editor", "viewer"]).default("editor"),
});

export const acceptInviteSchema = z.object({
  token: z.string().uuid(),
});

export const declineInviteSchema = z.object({
  token: z.string().uuid(),
});

export const removeMemberSchema = z.object({
  calendarId: z.string().uuid(),
  memberId: z.string().uuid(),
});

export const leaveCalendarSchema = z.object({
  calendarId: z.string().uuid(),
});

export type InviteToCalendarInput = z.infer<typeof inviteToCalendarSchema>;
