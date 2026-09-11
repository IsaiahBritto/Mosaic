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
  acceptFriendRequestForUser,
  cancelFriendRequestForUser,
  declineFriendRequestForUser,
  getFriendsForUser,
  getReceivedFriendRequestsForUser,
  getSentFriendRequestsForUser,
  removeFriendForUser,
  sendFriendRequestForUser,
} from "@/lib/services/friends.service";
import { getRequesterDisplayName } from "@/lib/repositories/friends.repository";
import {
  friendRequestIdSchema,
  removeFriendSchema,
  sendFriendRequestSchema,
} from "@/lib/validation/friends";

function revalidateFriendsViews() {
  revalidatePath("/", "layout");
  revalidatePath("/calendars");
  revalidatePath("/month");
  revalidatePath("/week");
  revalidatePath("/year");
}

export async function sendFriendRequest(input: {
  email: string;
}): Promise<ActionResult<null>> {
  const parsed = sendFriendRequestSchema.safeParse(input);
  if (!parsed.success) {
    return actionError(
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "Invalid email",
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return actionError("UNAUTHORIZED", "You must be signed in");
  }

  try {
    await sendFriendRequestForUser(
      supabase,
      user.id,
      user.email,
      parsed.data.email,
    );
    revalidateFriendsViews();
    return actionSuccess(null);
  } catch (error) {
    if (isAppError(error)) {
      return actionError(error.code, error.message);
    }
    return actionError(
      "UNKNOWN",
      error instanceof Error ? error.message : "Failed to send friend request",
    );
  }
}

export async function cancelFriendRequest(input: {
  requestId: string;
}): Promise<ActionResult<null>> {
  const parsed = friendRequestIdSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("VALIDATION_ERROR", "Invalid request");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return actionError("UNAUTHORIZED", "You must be signed in");
  }

  try {
    await cancelFriendRequestForUser(supabase, user.id, parsed.data.requestId);
    revalidateFriendsViews();
    return actionSuccess(null);
  } catch (error) {
    if (isAppError(error)) {
      return actionError(error.code, error.message);
    }
    return actionError(
      "UNKNOWN",
      error instanceof Error ? error.message : "Failed to cancel friend request",
    );
  }
}

export async function acceptFriendRequest(input: {
  requestId: string;
}): Promise<ActionResult<null>> {
  const parsed = friendRequestIdSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("VALIDATION_ERROR", "Invalid request");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return actionError("UNAUTHORIZED", "You must be signed in");
  }

  try {
    await acceptFriendRequestForUser(
      supabase,
      user.id,
      user.email,
      parsed.data.requestId,
    );
    revalidateFriendsViews();
    return actionSuccess(null);
  } catch (error) {
    if (isAppError(error)) {
      return actionError(error.code, error.message);
    }
    return actionError(
      "UNKNOWN",
      error instanceof Error ? error.message : "Failed to accept friend request",
    );
  }
}

export async function declineFriendRequest(input: {
  requestId: string;
}): Promise<ActionResult<null>> {
  const parsed = friendRequestIdSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("VALIDATION_ERROR", "Invalid request");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return actionError("UNAUTHORIZED", "You must be signed in");
  }

  try {
    await declineFriendRequestForUser(
      supabase,
      user.id,
      user.email,
      parsed.data.requestId,
    );
    revalidateFriendsViews();
    return actionSuccess(null);
  } catch (error) {
    if (isAppError(error)) {
      return actionError(error.code, error.message);
    }
    return actionError(
      "UNKNOWN",
      error instanceof Error ? error.message : "Failed to decline friend request",
    );
  }
}

export async function removeFriend(input: {
  friendId: string;
}): Promise<ActionResult<null>> {
  const parsed = removeFriendSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("VALIDATION_ERROR", "Invalid friend");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return actionError("UNAUTHORIZED", "You must be signed in");
  }

  try {
    await removeFriendForUser(supabase, user.id, parsed.data.friendId);
    revalidateFriendsViews();
    return actionSuccess(null);
  } catch (error) {
    if (isAppError(error)) {
      return actionError(error.code, error.message);
    }
    return actionError(
      "UNKNOWN",
      error instanceof Error ? error.message : "Failed to remove friend",
    );
  }
}

export async function getFriends(): Promise<
  ActionResult<
    Array<{
      id: string;
      displayName: string;
      avatarUrl: string | null;
    }>
  >
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return actionError("UNAUTHORIZED", "You must be signed in");
  }

  try {
    const friends = await getFriendsForUser(supabase, user.id);
    return actionSuccess(
      friends.map((friend) => ({
        id: friend.id,
        displayName: friend.display_name,
        avatarUrl: friend.avatar_url,
      })),
    );
  } catch (error) {
    return actionError(
      "UNKNOWN",
      error instanceof Error ? error.message : "Failed to load friends",
    );
  }
}

export async function getSentFriendRequests(): Promise<
  ActionResult<
    Array<{
      id: string;
      recipientEmail: string;
      createdAt: string;
    }>
  >
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return actionError("UNAUTHORIZED", "You must be signed in");
  }

  try {
    const requests = await getSentFriendRequestsForUser(supabase, user.id);
    return actionSuccess(
      requests.map((request) => ({
        id: request.id,
        recipientEmail: request.recipient_email,
        createdAt: request.created_at,
      })),
    );
  } catch (error) {
    return actionError(
      "UNKNOWN",
      error instanceof Error ? error.message : "Failed to load sent requests",
    );
  }
}

export async function getReceivedFriendRequests(): Promise<
  ActionResult<
    Array<{
      id: string;
      requesterName: string;
      createdAt: string;
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

  try {
    const requests = await getReceivedFriendRequestsForUser(
      supabase,
      user.id,
      user.email,
    );
    return actionSuccess(
      requests.map((request) => ({
        id: request.id,
        requesterName: getRequesterDisplayName(request),
        createdAt: request.created_at,
      })),
    );
  } catch (error) {
    return actionError(
      "UNKNOWN",
      error instanceof Error ? error.message : "Failed to load friend requests",
    );
  }
}
