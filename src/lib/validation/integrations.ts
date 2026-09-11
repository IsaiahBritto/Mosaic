import { z } from "zod";

export const updateConnectionDisplayNameSchema = z.object({
  connectionId: z.string().uuid(),
  displayName: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(50)
    .nullable(),
});

export type UpdateConnectionDisplayNameInput = z.infer<
  typeof updateConnectionDisplayNameSchema
>;
