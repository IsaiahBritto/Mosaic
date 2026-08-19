import type { SupabaseClient } from "@supabase/supabase-js";
import type { CalendarRole } from "@/types/calendar";
import { AppError } from "@/lib/errors";
import { getCalendarRole } from "@/lib/queries/permissions";

const ROLE_RANK: Record<CalendarRole, number> = {
  viewer: 1,
  editor: 2,
  owner: 3,
};

export async function requireCalendarRole(
  supabase: SupabaseClient,
  userId: string,
  calendarId: string,
  minRole: CalendarRole = "editor",
): Promise<CalendarRole> {
  const role = await getCalendarRole(supabase, userId, calendarId);

  if (!role || ROLE_RANK[role] < ROLE_RANK[minRole]) {
    throw new AppError(
      "FORBIDDEN",
      "You do not have permission for this calendar",
      403,
    );
  }

  return role;
}
