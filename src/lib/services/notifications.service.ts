import type { SupabaseClient } from "@supabase/supabase-js";
import {
  fetchPendingInvitesForEmail,
  getCalendarInviteName,
} from "@/lib/repositories/members.repository";
import {
  fetchPendingIncomingRequests,
  getRequesterDisplayName,
} from "@/lib/repositories/friends.repository";
import {
  fetchUnreadUserNotifications,
  markUserNotificationRead,
  type UserNotificationRow,
} from "@/lib/repositories/notifications.repository";

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

export type ActivityNotification = {
  type: "calendar_member_removed" | "calendar_member_left";
  id: string;
  message: string;
  createdAt: string;
};

export type NotificationItem =
  | FriendRequestNotification
  | CalendarInviteNotification
  | ActivityNotification;

export type NotificationsFeed = {
  friendRequests: FriendRequestNotification[];
  calendarInvites: CalendarInviteNotification[];
  activity: ActivityNotification[];
  count: number;
};

function formatActivityNotification(row: UserNotificationRow): ActivityNotification {
  const payload = row.payload as Record<string, string>;

  if (row.type === "calendar_member_removed") {
    const calendarName = payload.calendarName ?? "a calendar";
    const actorName = payload.actorName ?? "The owner";
    return {
      type: "calendar_member_removed",
      id: row.id,
      message: `${actorName} removed you from ${calendarName}`,
      createdAt: row.created_at,
    };
  }

  const calendarName = payload.calendarName ?? "a calendar";
  const memberName = payload.memberName ?? "A member";
  return {
    type: "calendar_member_left",
    id: row.id,
    message: `${memberName} left ${calendarName}`,
    createdAt: row.created_at,
  };
}

export async function getNotificationsForUser(
  supabase: SupabaseClient,
  userId: string,
  email: string,
): Promise<NotificationsFeed> {
  const [friendRequestRows, calendarInviteRows, activityRows] = await Promise.all([
    fetchPendingIncomingRequests(supabase, userId, email),
    fetchPendingInvitesForEmail(supabase, email),
    fetchUnreadUserNotifications(supabase, userId),
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

  const activity = activityRows.map(formatActivityNotification);

  return {
    friendRequests,
    calendarInvites,
    activity,
    count: friendRequests.length + calendarInvites.length + activity.length,
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

export async function dismissNotificationForUser(
  supabase: SupabaseClient,
  userId: string,
  notificationId: string,
): Promise<void> {
  await markUserNotificationRead(supabase, userId, notificationId);
}
