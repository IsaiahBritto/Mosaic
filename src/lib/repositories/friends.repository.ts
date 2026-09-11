import type { SupabaseClient } from "@supabase/supabase-js";

export type FriendRequestRow = {
  id: string;
  requester_id: string;
  recipient_email: string;
  recipient_id: string | null;
  status: string;
  created_at: string;
};

export type FriendProfile = {
  id: string;
  display_name: string;
  avatar_url: string | null;
};

export type FriendRequestWithRequester = FriendRequestRow & {
  requester: FriendProfile | null;
};

export function getRequesterDisplayName(
  request: { requester: FriendProfile | null },
): string {
  return request.requester?.display_name?.trim() || "Someone";
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function fetchUserIdByEmail(
  supabase: SupabaseClient,
  email: string,
): Promise<string | null> {
  const { data, error } = await supabase.rpc("get_user_id_by_email", {
    p_email: normalizeEmail(email),
  });

  if (error) {
    throw new Error(error.message);
  }

  return (data as string | null) ?? null;
}

export async function fetchUserEmailById(
  supabase: SupabaseClient,
  userId: string,
): Promise<string | null> {
  const { data, error } = await supabase.rpc("get_user_email_by_id", {
    p_user_id: userId,
  });

  if (error) {
    throw new Error(error.message);
  }

  return (data as string | null) ?? null;
}

export async function checkAreFriends(
  supabase: SupabaseClient,
  userId: string,
  otherId: string,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("are_friends", {
    p_user_id: userId,
    p_other_id: otherId,
  });

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(data);
}

export async function insertFriendRequest(
  supabase: SupabaseClient,
  requesterId: string,
  recipientEmail: string,
  recipientId: string | null,
): Promise<FriendRequestRow> {
  const { data, error } = await supabase
    .from("friend_requests")
    .insert({
      requester_id: requesterId,
      recipient_email: normalizeEmail(recipientEmail),
      recipient_id: recipientId,
      status: "pending",
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create friend request");
  }

  return data as FriendRequestRow;
}

export async function fetchPendingRequestBetween(
  supabase: SupabaseClient,
  userId: string,
  email: string,
  otherUserId: string | null,
): Promise<FriendRequestRow | null> {
  const normalizedEmail = normalizeEmail(email);

  const { data: outgoing, error: outgoingError } = await supabase
    .from("friend_requests")
    .select("*")
    .eq("status", "pending")
    .eq("requester_id", userId)
    .eq("recipient_email", normalizedEmail)
    .maybeSingle();

  if (outgoingError) {
    throw new Error(outgoingError.message);
  }

  if (outgoing) {
    return outgoing as FriendRequestRow;
  }

  if (otherUserId) {
    const { data: incomingById, error: incomingByIdError } = await supabase
      .from("friend_requests")
      .select("*")
      .eq("status", "pending")
      .eq("requester_id", otherUserId)
      .eq("recipient_id", userId)
      .maybeSingle();

    if (incomingByIdError) {
      throw new Error(incomingByIdError.message);
    }

    if (incomingById) {
      return incomingById as FriendRequestRow;
    }
  }

  const { data: incomingByEmail, error: incomingByEmailError } = await supabase
    .from("friend_requests")
    .select("*")
    .eq("status", "pending")
    .eq("recipient_email", normalizedEmail)
    .neq("requester_id", userId)
    .maybeSingle();

  if (incomingByEmailError) {
    throw new Error(incomingByEmailError.message);
  }

  return (incomingByEmail as FriendRequestRow | null) ?? null;
}

export async function fetchPendingIncomingRequests(
  supabase: SupabaseClient,
  userId: string,
  email: string,
): Promise<FriendRequestWithRequester[]> {
  const normalizedEmail = normalizeEmail(email);

  const { data, error } = await supabase
    .from("friend_requests")
    .select(
      "*, requester:profiles!friend_requests_requester_id_fkey(id, display_name, avatar_url)",
    )
    .eq("status", "pending")
    .or(
      `recipient_id.eq.${userId},and(recipient_id.is.null,recipient_email.eq.${normalizedEmail})`,
    )
    .neq("requester_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as FriendRequestWithRequester[];
}

export async function fetchSentFriendRequests(
  supabase: SupabaseClient,
  requesterId: string,
): Promise<FriendRequestRow[]> {
  const { data, error } = await supabase
    .from("friend_requests")
    .select("*")
    .eq("requester_id", requesterId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as FriendRequestRow[];
}

export async function cancelFriendRequestById(
  supabase: SupabaseClient,
  requestId: string,
): Promise<void> {
  const { error } = await supabase
    .from("friend_requests")
    .update({ status: "cancelled" })
    .eq("id", requestId)
    .eq("status", "pending");

  if (error) {
    throw new Error(error.message);
  }
}

export async function declineFriendRequestById(
  supabase: SupabaseClient,
  requestId: string,
): Promise<void> {
  const { error } = await supabase
    .from("friend_requests")
    .update({ status: "declined" })
    .eq("id", requestId)
    .eq("status", "pending");

  if (error) {
    throw new Error(error.message);
  }
}

export async function acceptFriendRequestById(
  supabase: SupabaseClient,
  requestId: string,
): Promise<void> {
  const { error } = await supabase.rpc("accept_friend_request", {
    p_request_id: requestId,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function fetchFriendsForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<FriendProfile[]> {
  const { data, error } = await supabase
    .from("friendships")
    .select("user_a_id, user_b_id")
    .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`);

  if (error) {
    throw new Error(error.message);
  }

  const friendIds = (data ?? []).map((row) =>
    row.user_a_id === userId ? row.user_b_id : row.user_a_id,
  );

  if (friendIds.length === 0) {
    return [];
  }

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url")
    .in("id", friendIds)
    .order("display_name");

  if (profilesError) {
    throw new Error(profilesError.message);
  }

  return (profiles ?? []) as FriendProfile[];
}

export async function removeFriendship(
  supabase: SupabaseClient,
  userId: string,
  friendId: string,
): Promise<void> {
  const userA = userId < friendId ? userId : friendId;
  const userB = userId < friendId ? friendId : userId;

  const { error } = await supabase
    .from("friendships")
    .delete()
    .eq("user_a_id", userA)
    .eq("user_b_id", userB);

  if (error) {
    throw new Error(error.message);
  }
}
