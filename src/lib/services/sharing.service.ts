import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "@/lib/errors";
import {
  acceptInviteByToken,
  addCalendarToVisiblePreferences,
  declineInviteByToken,
  fetchInviteByToken,
  fetchPendingInvitesForEmail,
  fetchSentInvitesForCalendar,
  insertPendingInvite,
  removeMemberById,
} from "@/lib/repositories/members.repository";
import { fetchCalendarById } from "@/lib/repositories/calendars.repository";
import { requireCalendarRole } from "@/lib/services/permissions.service";

export async function inviteToCalendarForUser(
  supabase: SupabaseClient,
  userId: string,
  calendarId: string,
  email: string,
  role: "editor" | "viewer" = "editor",
): Promise<{ token: string; inviteLink: string }> {
  await requireCalendarRole(supabase, userId, calendarId, "owner");

  const invite = await insertPendingInvite(
    supabase,
    calendarId,
    email,
    role,
  );

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return {
    token: invite.invite_token,
    inviteLink: `${baseUrl}/invites/${invite.invite_token}`,
  };
}

export async function acceptInviteForUser(
  supabase: SupabaseClient,
  userId: string,
  userEmail: string,
  token: string,
): Promise<string> {
  try {
    const calendarId = await acceptInviteByToken(
      supabase,
      token,
      userId,
      userEmail,
    );
    await addCalendarToVisiblePreferences(supabase, userId, calendarId);
    return calendarId;
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Email mismatch") {
        throw new AppError("FORBIDDEN", "This invite was sent to a different email", 403);
      }
      if (error.message === "Invite not found") {
        throw new AppError("NOT_FOUND", "Invite not found or already used", 404);
      }
    }
    throw error;
  }
}

export async function declineInviteForUser(
  supabase: SupabaseClient,
  token: string,
): Promise<void> {
  await declineInviteByToken(supabase, token);
}

export async function getPendingInvitesForUser(
  supabase: SupabaseClient,
  email: string,
) {
  return fetchPendingInvitesForEmail(supabase, email);
}

export async function getSentInvitesForCalendar(
  supabase: SupabaseClient,
  userId: string,
  calendarId: string,
) {
  await requireCalendarRole(supabase, userId, calendarId, "owner");
  return fetchSentInvitesForCalendar(supabase, calendarId);
}

export async function removeMemberForUser(
  supabase: SupabaseClient,
  userId: string,
  calendarId: string,
  memberId: string,
): Promise<void> {
  await requireCalendarRole(supabase, userId, calendarId, "owner");
  await removeMemberById(supabase, memberId);
}

export async function leaveCalendarForUser(
  supabase: SupabaseClient,
  userId: string,
  calendarId: string,
): Promise<void> {
  const calendar = await fetchCalendarById(supabase, calendarId);
  if (calendar?.owner_id === userId) {
    throw new AppError("FORBIDDEN", "Owners cannot leave their own calendar", 403);
  }

  const { error } = await supabase
    .from("calendar_members")
    .delete()
    .eq("calendar_id", calendarId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function getInviteDetails(
  supabase: SupabaseClient,
  token: string,
) {
  return fetchInviteByToken(supabase, token);
}
