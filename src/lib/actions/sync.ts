"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  actionError,
  actionSuccess,
  type ActionResult,
} from "@/lib/actions/types";
import { createClient } from "@/lib/supabase/server";
import type { ConflictPayload } from "@/lib/integrations/sync-types";
import { fetchConflictEventsForUser } from "@/lib/repositories/events.repository";
import { mosaicEventToGoogleBody } from "@/lib/integrations/google/event-map";
import { getGoogleTokens } from "@/lib/integrations/google/token-store";
import { GoogleCalendarClient } from "@/lib/integrations/google/client";

export type ConflictEventItem = {
  eventId: string;
  title: string;
  calendarName: string;
  provider: string;
  mosaic: ConflictPayload["mosaic"];
  external: ConflictPayload["external"];
};

export async function getUnresolvedConflicts(): Promise<
  ActionResult<ConflictEventItem[]>
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return actionSuccess([]);
  }

  try {
    const rows = await fetchConflictEventsForUser(supabase, user.id);
    const items: ConflictEventItem[] = rows.map((row) => {
      const payload = row.conflict_payload as ConflictPayload;
      return {
        eventId: row.id,
        title: row.title,
        calendarName: row.calendars.name,
        provider: payload.provider,
        mosaic: payload.mosaic,
        external: payload.external,
      };
    });
    return actionSuccess(items);
  } catch (error) {
    return actionError(
      "UNKNOWN",
      error instanceof Error ? error.message : "Failed to load conflicts",
    );
  }
}

const resolveSchema = z.object({
  eventId: z.string().uuid(),
  choice: z.enum(["mosaic", "external"]),
});

export async function resolveEventConflict(input: {
  eventId: string;
  choice: "mosaic" | "external";
}): Promise<ActionResult<null>> {
  const parsed = resolveSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("VALIDATION_ERROR", "Invalid conflict resolution");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return actionError("UNAUTHORIZED", "You must be signed in");
  }

  const { data: event, error } = await supabase
    .from("events")
    .select(
      "id, calendar_id, title, location, notes, start_at, end_at, is_all_day, timezone, external_event_id, conflict_payload, calendars(connection_id, external_calendar_id, source, external_calendar_access_role)",
    )
    .eq("id", parsed.data.eventId)
    .eq("sync_status", "conflict")
    .maybeSingle();

  if (error || !event) {
    return actionError("NOT_FOUND", "Conflict not found");
  }

  const payload = event.conflict_payload as ConflictPayload;
  const calendarRaw = event.calendars as unknown;
  const calendar = (Array.isArray(calendarRaw) ? calendarRaw[0] : calendarRaw) as {
    connection_id: string | null;
    external_calendar_id: string | null;
    source: string;
    external_calendar_access_role: string | null;
  };

  try {
    if (parsed.data.choice === "mosaic") {
      await supabase
        .from("events")
        .update({
          sync_status: "pending_push",
          conflict_payload: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", event.id);
    } else {
      const external = payload.external;
      await supabase
        .from("events")
        .update({
          title: external.title,
          location: external.location,
          notes: external.notes,
          start_at: external.startAt,
          end_at: external.endAt,
          is_all_day: external.isAllDay,
          timezone: external.timezone,
          external_etag: external.externalEtag ?? null,
          external_updated_at: external.externalUpdatedAt ?? null,
          sync_status: "synced",
          conflict_payload: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", event.id);

      if (
        calendar.source === "google" &&
        calendar.connection_id &&
        calendar.external_calendar_id &&
        event.external_event_id
      ) {
        const { accessToken } = await getGoogleTokens(
          supabase,
          calendar.connection_id,
        );
        const client = new GoogleCalendarClient(accessToken);
        await client.updateEvent(
          calendar.external_calendar_id,
          event.external_event_id,
          mosaicEventToGoogleBody({
            title: external.title,
            location: external.location,
            notes: external.notes,
            startAt: external.startAt,
            endAt: external.endAt,
            isAllDay: external.isAllDay,
            timezone: external.timezone,
          }),
        );
      }
    }

    revalidatePath("/calendars");
    revalidatePath("/week");
    revalidatePath("/month");
    revalidatePath("/year");
    return actionSuccess(null);
  } catch (err) {
    return actionError(
      "UNKNOWN",
      err instanceof Error ? err.message : "Failed to resolve conflict",
    );
  }
}
