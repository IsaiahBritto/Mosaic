"use server";

import { revalidatePath } from "next/cache";
import {
  actionError,
  actionSuccess,
  type ActionResult,
} from "@/lib/actions/types";
import { parseDateParam, formatDateParam } from "@/lib/calendar/date-params";
import { computeRangeAvailability } from "@/lib/calendar/availability";
import type { DayAvailability } from "@/lib/calendar/availability";
import { createClient } from "@/lib/supabase/server";
import { getExpandedEventsInRange } from "@/lib/queries/events";
import {
  getCalendarDayUtcRange,
  getWeekCalendarDateParams,
  isValidTimezone,
  resolveCalendarDateParam,
} from "@/lib/calendar/timezone";

export async function getDisplayTimezoneFromPrefs(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return "America/New_York";
  }

  const { data } = await supabase
    .from("user_preferences")
    .select("default_timezone")
    .eq("user_id", user.id)
    .maybeSingle();

  return data?.default_timezone ?? "America/New_York";
}

export async function getWeekAvailability(
  dateParam?: string,
): Promise<Record<string, DayAvailability>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {};
  }

  const timezone = await getDisplayTimezoneFromPrefs();
  const { dateParam: anchorDate } = resolveCalendarDateParam(dateParam, timezone);
  const weekDateParams = getWeekCalendarDateParams(anchorDate, timezone);
  const { start: rangeStart } = getCalendarDayUtcRange(weekDateParams[0]!, timezone);
  const { end: rangeEnd } = getCalendarDayUtcRange(weekDateParams[6]!, timezone);

  const events = await getExpandedEventsInRange(rangeStart, rangeEnd);
  const map = computeRangeAvailability(rangeStart, rangeEnd, events, timezone);

  return Object.fromEntries(map.entries());
}

export async function setDayViewMode(
  mode: "timeline" | "agenda",
): Promise<ActionResult<null>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return actionError("UNAUTHORIZED", "You must be signed in");
  }

  const { error } = await supabase
    .from("user_preferences")
    .update({ day_view_mode: mode, updated_at: new Date().toISOString() })
    .eq("user_id", user.id);

  if (error) {
    return actionError("UNKNOWN", error.message);
  }

  revalidatePath("/day");
  return actionSuccess(null);
}

export async function getDayViewModeFromPrefs(): Promise<"timeline" | "agenda"> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return "timeline";
  }

  const { data } = await supabase
    .from("user_preferences")
    .select("day_view_mode")
    .eq("user_id", user.id)
    .maybeSingle();

  return data?.day_view_mode === "agenda" ? "agenda" : "timeline";
}

export async function syncDefaultTimezone(
  timezone: string,
): Promise<ActionResult<null>> {
  if (!isValidTimezone(timezone)) {
    return actionError("VALIDATION_ERROR", "Invalid timezone");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return actionError("UNAUTHORIZED", "You must be signed in");
  }

  const { data: prefs } = await supabase
    .from("user_preferences")
    .select("default_timezone")
    .eq("user_id", user.id)
    .maybeSingle();

  if (prefs?.default_timezone === timezone) {
    return actionSuccess(null);
  }

  const { error } = await supabase
    .from("user_preferences")
    .update({
      default_timezone: timezone,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id);

  if (error) {
    return actionError("UNKNOWN", error.message);
  }

  revalidatePath("/day");
  revalidatePath("/month");
  revalidatePath("/year");
  return actionSuccess(null);
}

export { formatDateParam };
