import type { SupabaseClient } from "@supabase/supabase-js";
import {
  fetchPendingInvitesForEmail,
  getCalendarInviteName,
} from "@/lib/repositories/members.repository";
import {
  fetchPendingIncomingRequests,
  getRequesterDisplayName,
} from "@/lib/repositories/friends.repository";

export type FriendRequestNotification = {
  type: "friend_request";
  id: string;
  requesterName: string;
  createdAt: string;
};

export type CalendarInviteNotification = {
  type: "calendar_invite";
  token: string;
  calendarName: string;
  role: string;
};

export type NotificationItem = FriendRequestNotification | CalendarInviteNotification;

export type NotificationsFeed = {
  friendRequests: FriendRequestNotification[];
  calendarInvites: CalendarInviteNotification[];
  count: number;
};

export async function getNotificationsForUser(
  supabase: SupabaseClient,
  userId: string,
  email: string,
): Promise<NotificationsFeed> {
  const [friendRequestRows, calendarInviteRows] = await Promise.all([
    fetchPendingIncomingRequests(supabase, userId, email),
    fetchPendingInvitesForEmail(supabase, email),
  ]);

  const friendRequests: FriendRequestNotification[] = friendRequestRows.map(
    (request) => ({
      type: "friend_request",
      id: request.id,
      requesterName: getRequesterDisplayName(request),
      createdAt: request.created_at,
    }),
  );

  const calendarInvites: CalendarInviteNotification[] = calendarInviteRows.map(
    (invite) => ({
      type: "calendar_invite",
      token: invite.invite_token,
      calendarName: getCalendarInviteName(invite),
      role: invite.role,
    }),
  );

  return {
    friendRequests,
    calendarInvites,
    count: friendRequests.length + calendarInvites.length,
  };
}

export async function getNotificationCountForUser(
  supabase: SupabaseClient,
  userId: string,
  email: string,
): Promise<number> {
  const feed = await getNotificationsForUser(supabase, userId, email);
  return feed.count;
}
