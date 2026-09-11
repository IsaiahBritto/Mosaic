import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "@/lib/errors";
import {
  acceptInviteByToken,
  addCalendarToVisiblePreferences,
  countAcceptedNonOwnerMembers,
  declineInviteByToken,
  fetchAcceptedMembersForCalendar,
  fetchInviteByToken,
  fetchMemberById,
  fetchPendingInvitesForEmail,
  fetchSentInvitesForCalendar,
  insertPendingInvite,
  removeCalendarFromVisiblePreferences,
  removeMemberById,
  type CalendarMemberDisplay,
} from "@/lib/repositories/members.repository";
import {
  fetchCalendarById,
  updateCalendarType,
} from "@/lib/repositories/calendars.repository";
import { insertUserNotification } from "@/lib/repositories/notifications.repository";
import { checkAreFriends } from "@/lib/repositories/friends.repository";
import { getFriendEmailForSharing } from "@/lib/services/friends.service";
import { requireCalendarRole } from "@/lib/services/permissions.service";
import type { CalendarRole } from "@/types/calendar";

export type CalendarSharingDetails = {
  calendarId: string;
  calendarName: string;
  owner: {
    userId: string;
    displayName: string;
  };
  members: CalendarMemberDisplay[];
  currentUserId: string;
  currentUserRole: CalendarRole;
  isOwner: boolean;
};

async function fetchProfileDisplayName(
  supabase: SupabaseClient,
  userId: string,
): Promise<string> {
  const { data, error } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data?.display_name?.trim() || "Member";
}

async function revertCalendarTypeIfNoMembers(
  supabase: SupabaseClient,
  calendarId: string,
  ownerId: string,
): Promise<void> {
  const remaining = await countAcceptedNonOwnerMembers(
    supabase,
    calendarId,
    ownerId,
  );
  if (remaining === 0) {
    await updateCalendarType(supabase, calendarId, "native");
  }
}

export async function getCalendarSharingDetailsForUser(
  supabase: SupabaseClient,
  userId: string,
  calendarId: string,
): Promise<CalendarSharingDetails> {
  const currentUserRole = await requireCalendarRole(
    supabase,
    userId,
    calendarId,
    "viewer",
  );

  const calendar = await fetchCalendarById(supabase, calendarId);
  if (!calendar) {
    throw new AppError("NOT_FOUND", "Calendar not found", 404);
  }

  const ownerDisplayName = await fetchProfileDisplayName(
    supabase,
    calendar.owner_id,
  );

  const allMembers = await fetchAcceptedMembersForCalendar(
    supabase,
    calendarId,
    calendar.owner_id,
  );

  const members = allMembers.filter((member) => !member.isOwner);

  return {
    calendarId,
    calendarName: calendar.name,
    owner: {
      userId: calendar.owner_id,
      displayName: ownerDisplayName,
    },
    members,
    currentUserId: userId,
    currentUserRole,
    isOwner: calendar.owner_id === userId,
  };
}

export async function inviteToCalendarForUser(
  supabase: SupabaseClient,
  userId: string,
  calendarId: string,
  friendUserId: string,
  role: "editor" | "viewer" = "editor",
): Promise<{ token: string; inviteLink: string }> {
  await requireCalendarRole(supabase, userId, calendarId, "owner");

  if (friendUserId === userId) {
    throw new AppError("VALIDATION_ERROR", "You cannot share a calendar with yourself", 400);
  }

  const areFriends = await checkAreFriends(supabase, userId, friendUserId);
  if (!areFriends) {
    throw new AppError("FORBIDDEN", "You can only share calendars with friends", 403);
  }

  const email = await getFriendEmailForSharing(supabase, friendUserId);

  const invite = await insertPendingInvite(
    supabase,
    calendarId,
    email,
    role,
    friendUserId,
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

  const member = await fetchMemberById(supabase, memberId);
  if (!member || member.calendar_id !== calendarId) {
    throw new AppError("NOT_FOUND", "Member not found", 404);
  }

  if (!member.user_id) {
    throw new AppError("VALIDATION_ERROR", "Cannot remove a pending invite this way", 400);
  }

  const calendar = await fetchCalendarById(supabase, calendarId);
  if (!calendar) {
    throw new AppError("NOT_FOUND", "Calendar not found", 404);
  }

  const actorName = await fetchProfileDisplayName(supabase, userId);
  const removedUserId = member.user_id;

  await removeMemberById(supabase, memberId);
  await removeCalendarFromVisiblePreferences(supabase, removedUserId, calendarId);

  await insertUserNotification(supabase, removedUserId, "calendar_member_removed", {
    calendarId,
    calendarName: calendar.name,
    actorName,
  });

  await revertCalendarTypeIfNoMembers(supabase, calendarId, calendar.owner_id);
}

export async function leaveCalendarForUser(
  supabase: SupabaseClient,
  userId: string,
  calendarId: string,
): Promise<void> {
  const calendar = await fetchCalendarById(supabase, calendarId);
  if (!calendar) {
    throw new AppError("NOT_FOUND", "Calendar not found", 404);
  }

  if (calendar.owner_id === userId) {
    throw new AppError("FORBIDDEN", "Owners cannot leave their own calendar", 403);
  }

  const memberName = await fetchProfileDisplayName(supabase, userId);

  const { error } = await supabase
    .from("calendar_members")
    .delete()
    .eq("calendar_id", calendarId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }

  await removeCalendarFromVisiblePreferences(supabase, userId, calendarId);

  await insertUserNotification(supabase, calendar.owner_id, "calendar_member_left", {
    calendarId,
    calendarName: calendar.name,
    memberName,
    memberId: userId,
  });

  await revertCalendarTypeIfNoMembers(supabase, calendarId, calendar.owner_id);
}

export async function getInviteDetails(
  supabase: SupabaseClient,
  token: string,
) {
  return fetchInviteByToken(supabase, token);
}
