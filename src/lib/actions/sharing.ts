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
  acceptInviteForUser,
  declineInviteForUser,
  getPendingInvitesForUser,
  getSentInvitesForCalendar,
  inviteToCalendarForUser,
  leaveCalendarForUser,
  removeMemberForUser,
} from "@/lib/services/sharing.service";
import {
  acceptInviteSchema,
  declineInviteSchema,
  inviteToCalendarSchema,
  leaveCalendarSchema,
  removeMemberSchema,
} from "@/lib/validation/sharing";

function revalidateSharingViews() {
  revalidatePath("/calendars");
  revalidatePath("/month");
  revalidatePath("/week");
  revalidatePath("/year");
}

export async function inviteToCalendar(input: {
  calendarId: string;
  email: string;
  role?: "editor" | "viewer";
}): Promise<ActionResult<{ inviteLink: string; token: string }>> {
  const parsed = inviteToCalendarSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return actionError("UNAUTHORIZED", "You must be signed in");
  }

  try {
    const result = await inviteToCalendarForUser(
      supabase,
      user.id,
      parsed.data.calendarId,
      parsed.data.email,
      parsed.data.role,
    );
    revalidateSharingViews();
    return actionSuccess(result);
  } catch (error) {
    if (isAppError(error)) {
      return actionError(error.code, error.message);
    }
    return actionError("UNKNOWN", error instanceof Error ? error.message : "Failed to invite");
  }
}

export async function acceptInvite(input: {
  token: string;
}): Promise<ActionResult<{ calendarId: string }>> {
  const parsed = acceptInviteSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("VALIDATION_ERROR", "Invalid token");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return actionError("UNAUTHORIZED", "You must be signed in");
  }

  try {
    const calendarId = await acceptInviteForUser(
      supabase,
      user.id,
      user.email,
      parsed.data.token,
    );
    revalidateSharingViews();
    return actionSuccess({ calendarId });
  } catch (error) {
    if (isAppError(error)) {
      return actionError(error.code, error.message);
    }
    return actionError("UNKNOWN", error instanceof Error ? error.message : "Failed to accept");
  }
}

export async function declineInvite(input: {
  token: string;
}): Promise<ActionResult<null>> {
  const parsed = declineInviteSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("VALIDATION_ERROR", "Invalid token");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return actionError("UNAUTHORIZED", "You must be signed in");
  }

  try {
    await declineInviteForUser(supabase, parsed.data.token);
    return actionSuccess(null);
  } catch (error) {
    return actionError("UNKNOWN", error instanceof Error ? error.message : "Failed to decline");
  }
}

export async function getPendingInvites(): Promise<
  ActionResult<
    Array<{
      token: string;
      calendarName: string;
      role: string;
    }>
  >
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return actionSuccess([]);
  }

  const invites = await getPendingInvitesForUser(supabase, user.email);
  return actionSuccess(
    invites.map((invite) => ({
      token: invite.invite_token,
      calendarName: invite.calendars.name,
      role: invite.role,
    })),
  );
}

export async function getSentInvites(calendarId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return actionError("UNAUTHORIZED", "You must be signed in");
  }

  try {
    const invites = await getSentInvitesForCalendar(supabase, user.id, calendarId);
    return actionSuccess(invites);
  } catch (error) {
    if (isAppError(error)) {
      return actionError(error.code, error.message);
    }
    return actionError("UNKNOWN", "Failed to load invites");
  }
}

export async function removeMember(input: {
  calendarId: string;
  memberId: string;
}): Promise<ActionResult<null>> {
  const parsed = removeMemberSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("VALIDATION_ERROR", "Invalid input");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return actionError("UNAUTHORIZED", "You must be signed in");
  }

  try {
    await removeMemberForUser(
      supabase,
      user.id,
      parsed.data.calendarId,
      parsed.data.memberId,
    );
    revalidateSharingViews();
    return actionSuccess(null);
  } catch (error) {
    if (isAppError(error)) {
      return actionError(error.code, error.message);
    }
    return actionError("UNKNOWN", "Failed to remove member");
  }
}

export async function leaveCalendar(input: {
  calendarId: string;
}): Promise<ActionResult<null>> {
  const parsed = leaveCalendarSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("VALIDATION_ERROR", "Invalid input");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return actionError("UNAUTHORIZED", "You must be signed in");
  }

  try {
    await leaveCalendarForUser(supabase, user.id, parsed.data.calendarId);
    revalidateSharingViews();
    return actionSuccess(null);
  } catch (error) {
    if (isAppError(error)) {
      return actionError(error.code, error.message);
    }
    return actionError("UNKNOWN", "Failed to leave calendar");
  }
}
