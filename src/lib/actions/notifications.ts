"use server";

import {
  actionError,
  actionSuccess,
  type ActionResult,
} from "@/lib/actions/types";
import { createClient } from "@/lib/supabase/server";
import {
  getNotificationCountForUser,
  getNotificationsForUser,
  type NotificationsFeed,
} from "@/lib/services/notifications.service";

export async function getNotifications(): Promise<ActionResult<NotificationsFeed>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return actionSuccess({
      friendRequests: [],
      calendarInvites: [],
      count: 0,
    });
  }

  try {
    const feed = await getNotificationsForUser(supabase, user.id, user.email);
    return actionSuccess(feed);
  } catch (error) {
    return actionError(
      "UNKNOWN",
      error instanceof Error ? error.message : "Failed to load notifications",
    );
  }
}

export async function getNotificationCount(): Promise<ActionResult<number>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return actionSuccess(0);
  }

  try {
    const count = await getNotificationCountForUser(
      supabase,
      user.id,
      user.email,
    );
    return actionSuccess(count);
  } catch (error) {
    return actionError(
      "UNKNOWN",
      error instanceof Error ? error.message : "Failed to load notification count",
    );
  }
}
