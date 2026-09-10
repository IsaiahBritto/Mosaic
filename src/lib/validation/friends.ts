import { z } from "zod";

export const sendFriendRequestSchema = z.object({
  email: z.string().email(),
});

export const friendRequestIdSchema = z.object({
  requestId: z.string().uuid(),
});

export const removeFriendSchema = z.object({
  friendId: z.string().uuid(),
});

export type SendFriendRequestInput = z.infer<typeof sendFriendRequestSchema>;
export type FriendRequestIdInput = z.infer<typeof friendRequestIdSchema>;
export type RemoveFriendInput = z.infer<typeof removeFriendSchema>;
