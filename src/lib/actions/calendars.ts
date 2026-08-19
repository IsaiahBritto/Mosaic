"use server";

import { revalidatePath } from "next/cache";
import {
  actionError,
  actionSuccess,
  type ActionResult,
} from "@/lib/actions/types";
import { isAppError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import {
  createCalendarForUser,
  deleteCalendarForUser,
  saveVisibleCalendarIds,
  setAllCalendarsVisibility,
  setSingleCalendarVisibility,
  updateCalendarForUser,
} from "@/lib/services/calendar.service";
import type { Calendar } from "@/types/calendar";
import {
  createCalendarSchema,
  deleteCalendarSchema,
  saveCalendarPreferencesSchema,
  setAllCalendarsVisibilitySchema,
  setCalendarVisibilitySchema,
  updateCalendarSchema,
} from "@/lib/validation/calendar";

function revalidateCalendarViews() {
  revalidatePath("/month");
  revalidatePath("/day");
  revalidatePath("/year");
  revalidatePath("/calendars");
}

async function getUserIdOrError(): Promise<
  ActionResult<never> | { userId: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return actionError("UNAUTHORIZED", "You must be signed in");
  }

  return { userId: user.id };
}

function isAuthError(
  result: ActionResult<never> | { userId: string },
): result is ActionResult<never> {
  return "success" in result && result.success === false;
}

export async function createCalendar(input: {
  name: string;
  colorHex: string;
  inviteEmail?: string;
}): Promise<ActionResult<Calendar>> {
  const parsed = createCalendarSchema.safeParse(input);
  if (!parsed.success) {
    return actionError(
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "Invalid input",
    );
  }

  const auth = await getUserIdOrError();
  if (isAuthError(auth)) return auth;

  try {
    const supabase = await createClient();
    const calendar = await createCalendarForUser(
      supabase,
      auth.userId,
      parsed.data.name,
      parsed.data.colorHex,
      parsed.data.inviteEmail,
    );
    revalidateCalendarViews();
    return actionSuccess(calendar);
  } catch (error) {
    return actionError(
      "UNKNOWN",
      error instanceof Error ? error.message : "Failed to create calendar",
    );
  }
}

export async function updateCalendar(input: {
  id: string;
  name?: string;
  colorHex?: string;
}): Promise<ActionResult<null>> {
  const parsed = updateCalendarSchema.safeParse(input);
  if (!parsed.success) {
    return actionError(
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "Invalid input",
    );
  }

  const auth = await getUserIdOrError();
  if (isAuthError(auth)) return auth;

  try {
    const supabase = await createClient();
    await updateCalendarForUser(supabase, auth.userId, parsed.data.id, {
      name: parsed.data.name,
      colorHex: parsed.data.colorHex,
    });
    revalidateCalendarViews();
    return actionSuccess(null);
  } catch (error) {
    if (isAppError(error)) {
      return actionError(error.code, error.message);
    }
    return actionError(
      "UNKNOWN",
      error instanceof Error ? error.message : "Failed to update calendar",
    );
  }
}

export async function deleteCalendar(input: {
  id: string;
}): Promise<ActionResult<null>> {
  const parsed = deleteCalendarSchema.safeParse(input);
  if (!parsed.success) {
    return actionError(
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "Invalid input",
    );
  }

  const auth = await getUserIdOrError();
  if (isAuthError(auth)) return auth;

  try {
    const supabase = await createClient();
    await deleteCalendarForUser(supabase, auth.userId, parsed.data.id);
    revalidateCalendarViews();
    return actionSuccess(null);
  } catch (error) {
    if (isAppError(error)) {
      return actionError(error.code, error.message);
    }
    return actionError(
      "UNKNOWN",
      error instanceof Error ? error.message : "Failed to delete calendar",
    );
  }
}

export async function setCalendarVisibility(input: {
  calendarId: string;
  visible: boolean;
}): Promise<ActionResult<null>> {
  const parsed = setCalendarVisibilitySchema.safeParse(input);
  if (!parsed.success) {
    return actionError(
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "Invalid input",
    );
  }

  const auth = await getUserIdOrError();
  if (isAuthError(auth)) return auth;

  try {
    const supabase = await createClient();
    await setSingleCalendarVisibility(
      supabase,
      auth.userId,
      parsed.data.calendarId,
      parsed.data.visible,
    );
    revalidateCalendarViews();
    return actionSuccess(null);
  } catch (error) {
    return actionError(
      "UNKNOWN",
      error instanceof Error ? error.message : "Failed to update visibility",
    );
  }
}

export async function setAllCalendarsVisibilityAction(input: {
  visible: boolean;
}): Promise<ActionResult<null>> {
  const parsed = setAllCalendarsVisibilitySchema.safeParse(input);
  if (!parsed.success) {
    return actionError("VALIDATION_ERROR", "Invalid input");
  }

  const auth = await getUserIdOrError();
  if (isAuthError(auth)) return auth;

  try {
    const supabase = await createClient();
    await setAllCalendarsVisibility(
      supabase,
      auth.userId,
      parsed.data.visible,
    );
    revalidateCalendarViews();
    return actionSuccess(null);
  } catch (error) {
    return actionError(
      "UNKNOWN",
      error instanceof Error ? error.message : "Failed to update visibility",
    );
  }
}

export async function saveCalendarPreferences(input: {
  visibleIds: string[];
}): Promise<ActionResult<null>> {
  const parsed = saveCalendarPreferencesSchema.safeParse(input);
  if (!parsed.success) {
    return actionError(
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "Invalid input",
    );
  }

  const auth = await getUserIdOrError();
  if (isAuthError(auth)) return auth;

  try {
    const supabase = await createClient();
    const { data: memberships } = await supabase
      .from("calendar_members")
      .select("calendar_id")
      .eq("user_id", auth.userId)
      .eq("invite_status", "accepted");

    const allCalendarIds = (memberships ?? []).map(
      (m: { calendar_id: string }) => m.calendar_id,
    );

    await saveVisibleCalendarIds(
      supabase,
      auth.userId,
      parsed.data.visibleIds,
      allCalendarIds,
    );
    revalidateCalendarViews();
    return actionSuccess(null);
  } catch (error) {
    return actionError(
      "UNKNOWN",
      error instanceof Error ? error.message : "Failed to save preferences",
    );
  }
}
