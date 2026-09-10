import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "@/lib/errors";
import {
  acceptFriendRequestById,
  cancelFriendRequestById,
  checkAreFriends,
  declineFriendRequestById,
  fetchFriendsForUser,
  fetchPendingIncomingRequests,
  fetchPendingRequestBetween,
  fetchSentFriendRequests,
  fetchUserEmailById,
  fetchUserIdByEmail,
  insertFriendRequest,
  removeFriendship,
  type FriendProfile,
  type FriendRequestRow,
  type FriendRequestWithRequester,
} from "@/lib/repositories/friends.repository";

export async function sendFriendRequestForUser(
  supabase: SupabaseClient,
  userId: string,
  userEmail: string,
  email: string,
): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();

  if (normalizedEmail === userEmail.toLowerCase()) {
    throw new AppError("VALIDATION_ERROR", "You cannot send a friend request to yourself", 400);
  }

  const recipientId = await fetchUserIdByEmail(supabase, normalizedEmail);

  if (recipientId === userId) {
    throw new AppError("VALIDATION_ERROR", "You cannot send a friend request to yourself", 400);
  }

  if (recipientId) {
    const alreadyFriends = await checkAreFriends(supabase, userId, recipientId);
    if (alreadyFriends) {
      throw new AppError("CONFLICT", "You are already friends with this person", 409);
    }
  }

  const existingRequest = await fetchPendingRequestBetween(
    supabase,
    userId,
    normalizedEmail,
    recipientId,
  );

  if (existingRequest) {
    throw new AppError("CONFLICT", "A friend request is already pending", 409);
  }

  await insertFriendRequest(supabase, userId, normalizedEmail, recipientId);
}

export async function cancelFriendRequestForUser(
  supabase: SupabaseClient,
  userId: string,
  requestId: string,
): Promise<void> {
  const { data, error } = await supabase
    .from("friend_requests")
    .select("id, requester_id, status")
    .eq("id", requestId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data || data.requester_id !== userId) {
    throw new AppError("NOT_FOUND", "Friend request not found", 404);
  }

  if (data.status !== "pending") {
    throw new AppError("VALIDATION_ERROR", "Only pending requests can be cancelled", 400);
  }

  await cancelFriendRequestById(supabase, requestId);
}

export async function acceptFriendRequestForUser(
  supabase: SupabaseClient,
  userId: string,
  userEmail: string,
  requestId: string,
): Promise<void> {
  const { data, error } = await supabase
    .from("friend_requests")
    .select("*")
    .eq("id", requestId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data || data.status !== "pending") {
    throw new AppError("NOT_FOUND", "Friend request not found", 404);
  }

  const isRecipient =
    data.recipient_id === userId ||
    (data.recipient_id === null &&
      data.recipient_email.toLowerCase() === userEmail.toLowerCase());

  if (!isRecipient || data.requester_id === userId) {
    throw new AppError("FORBIDDEN", "Not authorized to accept this request", 403);
  }

  await acceptFriendRequestById(supabase, requestId);
}

export async function declineFriendRequestForUser(
  supabase: SupabaseClient,
  userId: string,
  userEmail: string,
  requestId: string,
): Promise<void> {
  const { data, error } = await supabase
    .from("friend_requests")
    .select("*")
    .eq("id", requestId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data || data.status !== "pending") {
    throw new AppError("NOT_FOUND", "Friend request not found", 404);
  }

  const isRecipient =
    data.recipient_id === userId ||
    (data.recipient_id === null &&
      data.recipient_email.toLowerCase() === userEmail.toLowerCase());

  if (!isRecipient || data.requester_id === userId) {
    throw new AppError("FORBIDDEN", "Not authorized to decline this request", 403);
  }

  await declineFriendRequestById(supabase, requestId);
}

export async function removeFriendForUser(
  supabase: SupabaseClient,
  userId: string,
  friendId: string,
): Promise<void> {
  const alreadyFriends = await checkAreFriends(supabase, userId, friendId);
  if (!alreadyFriends) {
    throw new AppError("NOT_FOUND", "Friend not found", 404);
  }

  await removeFriendship(supabase, userId, friendId);
}

export async function getFriendsForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<FriendProfile[]> {
  return fetchFriendsForUser(supabase, userId);
}

export async function getSentFriendRequestsForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<FriendRequestRow[]> {
  return fetchSentFriendRequests(supabase, userId);
}

export async function getReceivedFriendRequestsForUser(
  supabase: SupabaseClient,
  userId: string,
  email: string,
): Promise<FriendRequestWithRequester[]> {
  return fetchPendingIncomingRequests(supabase, userId, email);
}

export async function getFriendEmailForSharing(
  supabase: SupabaseClient,
  friendUserId: string,
): Promise<string> {
  const email = await fetchUserEmailById(supabase, friendUserId);
  if (!email) {
    throw new AppError("NOT_FOUND", "Friend account not found", 404);
  }
  return email;
}
