"use server";

import { revalidatePath } from "next/cache";
import {
  actionError,
  actionSuccess,
  type ActionResult,
} from "@/lib/actions/types";
import { createClient } from "@/lib/supabase/server";
import {
  dismissNotificationForUser,
  getNotificationCountForUser,
  getNotificationsForUser,
  type NotificationsFeed,
} from "@/lib/services/notifications.service";
import { dismissNotificationSchema } from "@/lib/validation/sharing";

function revalidateNotificationViews() {
  revalidatePath("/", "layout");
}

export async function getNotifications(): Promise<ActionResult<NotificationsFeed>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return actionSuccess({
      friendRequests: [],
      calendarInvites: [],
      activity: [],
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

export async function dismissNotification(input: {
  notificationId: string;
}): Promise<ActionResult<null>> {
  const parsed = dismissNotificationSchema.safeParse(input);
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
    await dismissNotificationForUser(
      supabase,
      user.id,
      parsed.data.notificationId,
    );
    revalidateNotificationViews();
    return actionSuccess(null);
  } catch (error) {
    return actionError(
      "UNKNOWN",
      error instanceof Error ? error.message : "Failed to dismiss notification",
    );
  }
}
