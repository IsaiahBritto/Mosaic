import type { SupabaseClient } from "@supabase/supabase-js";

export type UserNotificationType =
  | "calendar_member_removed"
  | "calendar_member_left";

export type UserNotificationRow = {
  id: string;
  user_id: string;
  type: UserNotificationType;
  payload: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
};

export async function insertUserNotification(
  supabase: SupabaseClient,
  userId: string,
  type: UserNotificationType,
  payload: Record<string, unknown>,
): Promise<string> {
  const { data, error } = await supabase.rpc("insert_user_notification", {
    p_user_id: userId,
    p_type: type,
    p_payload: payload,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data as string;
}

export async function fetchUnreadUserNotifications(
  supabase: SupabaseClient,
  userId: string,
): Promise<UserNotificationRow[]> {
  const { data, error } = await supabase
    .from("user_notifications")
    .select("*")
    .eq("user_id", userId)
    .is("read_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as UserNotificationRow[];
}

export async function markUserNotificationRead(
  supabase: SupabaseClient,
  userId: string,
  notificationId: string,
): Promise<void> {
  const { error } = await supabase
    .from("user_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", userId)
    .is("read_at", null);

  if (error) {
    throw new Error(error.message);
  }
}
