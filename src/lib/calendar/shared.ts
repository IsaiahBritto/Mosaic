import type { CalendarRole, CalendarType } from "@/types/calendar";

export function isSharedCalendar(calendar: {
  type: CalendarType;
  role: CalendarRole;
}): boolean {
  return calendar.type === "shared" || calendar.role !== "owner";
}
