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
  resyncAllLinkedCalendarsForUser,
  saveAppleConnection,
} from "@/lib/integrations/sync.service";
import type { CalendarConnection } from "@/lib/integrations/types";
import type { ResyncResult } from "@/lib/integrations/sync-types";

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

export async function resyncAllLinkedCalendars(): Promise<
  ActionResult<ResyncResult>
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return actionError("UNAUTHORIZED", "You must be signed in");
  }

  try {
    const result = await resyncAllLinkedCalendarsForUser(supabase, user.id, {
      force: true,
    });

    if (result.errors.includes("sync_in_progress")) {
      return actionError("UNKNOWN", "Sync already running. Please wait.");
    }

    revalidatePath("/calendars");
    revalidatePath("/week");
    revalidatePath("/month");
    revalidatePath("/year");
    return actionSuccess(result);
  } catch (error) {
    if (isAppError(error)) {
      return actionError(error.code, error.message);
    }
    return actionError("UNKNOWN", "Sync failed");
  }
}

/** @deprecated Use resyncAllLinkedCalendars */
export async function syncNow(): Promise<ActionResult<null>> {
  const result = await resyncAllLinkedCalendars();
  if (!result.success) {
    return actionError(result.error, result.message);
  }
  return actionSuccess(null);
}

export async function disconnectAppleConnection(
  connectionId: string,
): Promise<ActionResult<null>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return actionError("UNAUTHORIZED", "You must be signed in");
  }

  try {
    const { deleteAppleConnection } = await import(
      "@/lib/integrations/apple/disconnect"
    );
    await deleteAppleConnection(supabase, connectionId, user.id);
    revalidatePath("/calendars");
    revalidatePath("/week");
    revalidatePath("/month");
    revalidatePath("/year");
    return actionSuccess(null);
  } catch (error) {
    return actionError(
      "UNKNOWN",
      error instanceof Error ? error.message : "Disconnect failed",
    );
  }
}

export async function disconnectGoogleConnection(
  connectionId: string,
): Promise<ActionResult<null>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return actionError("UNAUTHORIZED", "You must be signed in");
  }

  try {
    const { revokeAndDeleteGoogleConnection } = await import(
      "@/lib/integrations/google/token-store"
    );
    await revokeAndDeleteGoogleConnection(supabase, connectionId, user.id);
    revalidatePath("/calendars");
    revalidatePath("/week");
    revalidatePath("/month");
    revalidatePath("/year");
    return actionSuccess(null);
  } catch (error) {
    return actionError(
      "UNKNOWN",
      error instanceof Error ? error.message : "Disconnect failed",
    );
  }
}
