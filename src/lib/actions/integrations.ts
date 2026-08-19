"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  actionError,
  actionSuccess,
  type ActionResult,
} from "@/lib/actions/types";
import { isAppError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import {
  fetchConnectionsForUser,
  runConnectionSync,
  saveAppleConnection,
} from "@/lib/integrations/sync.service";
import type { CalendarConnection } from "@/lib/integrations/types";

const appleConnectSchema = z.object({
  appleId: z.string().email(),
  appPassword: z.string().min(8),
});

export async function connectAppleCalendar(input: {
  appleId: string;
  appPassword: string;
}): Promise<ActionResult<{ connectionId: string }>> {
  const parsed = appleConnectSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("VALIDATION_ERROR", "Invalid Apple credentials");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return actionError("UNAUTHORIZED", "You must be signed in");
  }

  try {
    const connectionId = await saveAppleConnection(
      supabase,
      user.id,
      parsed.data.appleId,
      parsed.data.appPassword,
    );
    revalidatePath("/calendars");
    return actionSuccess({ connectionId });
  } catch (error) {
    return actionError(
      "UNKNOWN",
      error instanceof Error ? error.message : "Failed to connect Apple",
    );
  }
}

export async function getConnections(): Promise<ActionResult<CalendarConnection[]>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return actionSuccess([]);
  }

  const connections = await fetchConnectionsForUser(supabase, user.id);
  return actionSuccess(connections);
}

export async function syncNow(): Promise<ActionResult<null>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return actionError("UNAUTHORIZED", "You must be signed in");
  }

  try {
    const connections = await fetchConnectionsForUser(supabase, user.id);
    for (const connection of connections) {
      await runConnectionSync(supabase, connection);
    }
    revalidatePath("/calendars");
    revalidatePath("/day");
    revalidatePath("/month");
    revalidatePath("/year");
    return actionSuccess(null);
  } catch (error) {
    if (isAppError(error)) {
      return actionError(error.code, error.message);
    }
    return actionError("UNKNOWN", "Sync failed");
  }
}
