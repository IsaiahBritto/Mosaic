import { addDays } from "date-fns";
import type { SupabaseClient } from "@supabase/supabase-js";
import { GoogleCalendarClient } from "@/lib/integrations/google/client";
import {
  googleEventToSnapshot,
  mosaicEventToGoogleBody,
  snapshotFromMosaicRow,
} from "@/lib/integrations/google/event-map";
import { getGoogleTokens } from "@/lib/integrations/google/token-store";
import type { SyncResult } from "@/lib/integrations/types";
import type { ConflictSummary } from "@/lib/integrations/sync-types";
import {
  acquireSyncLock,
  fetchLinkedCalendarsForConnection,
  releaseSyncLock,
  writeSyncLog,
  type LinkedCalendarRow,
} from "@/lib/repositories/connections.repository";

type PendingEventRow = {
  id: string;
  calendar_id: string;
  created_by: string;
  title: string;
  location: string | null;
  notes: string | null;
  start_at: string;
  end_at: string;
  is_all_day: boolean;
  timezone: string;
  external_event_id: string | null;
  external_etag: string | null;
  external_updated_at: string | null;
  sync_status: string;
  external_metadata: { pendingDelete?: boolean } | null;
  updated_at: string;
};

function isPendingDelete(row: PendingEventRow): boolean {
  return row.external_metadata?.pendingDelete === true;
}

export async function syncGoogleConnection(
  supabase: SupabaseClient,
  connectionId: string,
  options?: { force?: boolean },
): Promise<SyncResult & { conflicts: ConflictSummary[] }> {
  const result: SyncResult & { conflicts: ConflictSummary[] } = {
    connectionId,
    provider: "google",
    pulled: 0,
    pushed: 0,
    errors: [],
    conflicts: [],
  };

  const locked = await acquireSyncLock(supabase, connectionId);
  if (!locked && !options?.force) {
    result.errors.push("sync_in_progress");
    return result;
  }

  await supabase
    .from("calendar_connections")
    .update({ last_sync_status: "syncing", last_sync_error: null })
    .eq("id", connectionId);

  try {
    const { accessToken } = await getGoogleTokens(supabase, connectionId);
    const client = new GoogleCalendarClient(accessToken);
    const calendars = await fetchLinkedCalendarsForConnection(
      supabase,
      connectionId,
    );

    for (const calendar of calendars) {
      try {
        const pushResult = await pushCalendarEvents(
          supabase,
          client,
          connectionId,
          calendar,
        );
        result.pushed += pushResult.pushed;
        result.errors.push(...pushResult.errors);

        const pullResult = await pullCalendarEvents(
          supabase,
          client,
          connectionId,
          calendar,
        );
        result.pulled += pullResult.pulled;
        result.conflicts.push(...pullResult.conflicts);
        result.errors.push(...pullResult.errors);
      } catch (error) {
        result.errors.push(
          error instanceof Error ? error.message : "Calendar sync failed",
        );
      }
    }

    await supabase
      .from("calendar_connections")
      .update({
        last_sync_at: new Date().toISOString(),
        last_sync_status: result.errors.length ? "error" : "ok",
        last_sync_error: result.errors[0] ?? null,
      })
      .eq("id", connectionId);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Google sync failed";
    result.errors.push(message);
    await supabase
      .from("calendar_connections")
      .update({
        last_sync_status: "error",
        last_sync_error: message.includes("invalid_grant")
          ? "token_revoked"
          : message,
      })
      .eq("id", connectionId);
  } finally {
    await releaseSyncLock(supabase, connectionId);
  }

  return result;
}

async function pushCalendarEvents(
  supabase: SupabaseClient,
  client: GoogleCalendarClient,
  connectionId: string,
  calendar: LinkedCalendarRow,
): Promise<{ pushed: number; errors: string[] }> {
  if (
    calendar.external_calendar_access_role === "reader" ||
    calendar.external_calendar_access_role === "freeBusyReader"
  ) {
    return { pushed: 0, errors: [] };
  }

  const externalId = calendar.external_calendar_id;
  if (!externalId) {
    return { pushed: 0, errors: ["Missing external calendar id"] };
  }

  const { data, error } = await supabase
    .from("events")
    .select(
      "id, calendar_id, created_by, title, location, notes, start_at, end_at, is_all_day, timezone, external_event_id, external_etag, external_updated_at, sync_status, external_metadata, updated_at",
    )
    .eq("calendar_id", calendar.id)
    .eq("sync_status", "pending_push");

  if (error) {
    return { pushed: 0, errors: [error.message] };
  }

  let pushed = 0;
  const errors: string[] = [];

  for (const row of (data ?? []) as PendingEventRow[]) {
    try {
      if (isPendingDelete(row)) {
        if (row.external_event_id) {
          await client.deleteEvent(externalId, row.external_event_id);
          await writeSyncLog(supabase, {
            connectionId,
            direction: "push",
            entityType: "event",
            entityId: row.id,
            externalId: row.external_event_id,
            action: "delete",
          });
        }
        await supabase.from("events").delete().eq("id", row.id);
        pushed++;
        continue;
      }

      const body = mosaicEventToGoogleBody({
        title: row.title,
        location: row.location,
        notes: row.notes,
        startAt: row.start_at,
        endAt: row.end_at,
        isAllDay: row.is_all_day,
        timezone: row.timezone,
      });

      let googleEvent;
      if (row.external_event_id) {
        googleEvent = await client.updateEvent(
          externalId,
          row.external_event_id,
          body,
        );
      } else {
        googleEvent = await client.createEvent(externalId, body);
      }

      await supabase
        .from("events")
        .update({
          external_event_id: googleEvent.id,
          external_etag: googleEvent.etag ?? null,
          external_updated_at: googleEvent.updated ?? null,
          sync_status: "synced",
          source: "google",
          external_metadata: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id);

      await writeSyncLog(supabase, {
        connectionId,
        direction: "push",
        entityType: "event",
        entityId: row.id,
        externalId: googleEvent.id,
        action: row.external_event_id ? "update" : "create",
      });

      pushed++;
    } catch (err) {
      errors.push(err instanceof Error ? err.message : "Push failed");
      await writeSyncLog(supabase, {
        connectionId,
        direction: "push",
        entityType: "event",
        entityId: row.id,
        action: "skip",
        detail: { error: err instanceof Error ? err.message : "unknown" },
      });
    }
  }

  return { pushed, errors };
}

async function pullCalendarEvents(
  supabase: SupabaseClient,
  client: GoogleCalendarClient,
  connectionId: string,
  calendar: LinkedCalendarRow,
): Promise<{ pulled: number; conflicts: ConflictSummary[]; errors: string[] }> {
  const externalId = calendar.external_calendar_id;
  if (!externalId) {
    return { pulled: 0, conflicts: [], errors: ["Missing external calendar id"] };
  }

  let syncToken = calendar.external_sync_token ?? undefined;
  let fullSyncRequired = false;
  const now = new Date();
  const timeMin = addDays(now, -30).toISOString();
  const timeMax = addDays(now, 365).toISOString();
  const allEvents: Awaited<
    ReturnType<GoogleCalendarClient["listEvents"]>
  >["events"] = [];

  let pageToken: string | undefined;
  while (true) {
    const page = await client.listEvents(externalId, {
      syncToken: fullSyncRequired ? undefined : syncToken,
      timeMin: syncToken && !fullSyncRequired ? undefined : timeMin,
      timeMax: syncToken && !fullSyncRequired ? undefined : timeMax,
      pageToken,
    });

    if (page.fullSyncRequired) {
      fullSyncRequired = true;
      syncToken = undefined;
      pageToken = undefined;
      allEvents.length = 0;
      await supabase
        .from("calendars")
        .update({ external_sync_token: null })
        .eq("id", calendar.id);
      await writeSyncLog(supabase, {
        connectionId,
        entityType: "calendar",
        entityId: calendar.id,
        action: "skip",
        detail: { reason: "sync_token_410_full_resync" },
      });
      continue;
    }

    allEvents.push(...page.events);
    pageToken = page.nextPageToken;

    if (page.nextSyncToken) {
      syncToken = page.nextSyncToken;
      await supabase
        .from("calendars")
        .update({ external_sync_token: page.nextSyncToken })
        .eq("id", calendar.id);
    }

    if (!pageToken) break;
  }

  let pulled = 0;
  const conflicts: ConflictSummary[] = [];
  const errors: string[] = [];

  for (const googleEvent of allEvents) {
    if (!googleEvent.id) continue;

    try {
      if (googleEvent.status === "cancelled") {
        const { data: existing } = await supabase
          .from("events")
          .select("id, sync_status")
          .eq("calendar_id", calendar.id)
          .eq("external_event_id", googleEvent.id)
          .maybeSingle();

        if (existing?.sync_status === "pending_push") {
          // conflict — local edits vs external delete
          const snapshot = googleEventToSnapshot(googleEvent);
          const { data: localRow } = await supabase
            .from("events")
            .select("*")
            .eq("id", existing.id)
            .single();

          if (localRow) {
            await markConflict(
              supabase,
              connectionId,
              localRow,
              snapshot,
              calendar.name,
              conflicts,
            );
          }
        } else if (existing) {
          await supabase.from("events").delete().eq("id", existing.id);
          pulled++;
        }
        continue;
      }

      const snapshot = googleEventToSnapshot(googleEvent);

      const { data: existing } = await supabase
        .from("events")
        .select("*")
        .eq("calendar_id", calendar.id)
        .eq("external_event_id", googleEvent.id)
        .maybeSingle();

      if (!existing) {
        const { data: owner } = await supabase
          .from("calendars")
          .select("owner_id")
          .eq("id", calendar.id)
          .single();

        await supabase.from("events").insert({
          calendar_id: calendar.id,
          created_by: owner?.owner_id,
          title: snapshot.title,
          location: snapshot.location,
          notes: snapshot.notes,
          start_at: snapshot.startAt,
          end_at: snapshot.endAt,
          is_all_day: snapshot.isAllDay,
          timezone: snapshot.timezone,
          source: "google",
          external_event_id: googleEvent.id,
          external_etag: googleEvent.etag ?? null,
          external_updated_at: googleEvent.updated ?? null,
          sync_status: "synced",
        });
        pulled++;
        continue;
      }

      if (existing.sync_status === "pending_push") {
        const externalChanged =
          googleEvent.etag && googleEvent.etag !== existing.external_etag;
        if (externalChanged) {
          await markConflict(
            supabase,
            connectionId,
            existing,
            snapshot,
            calendar.name,
            conflicts,
          );
        }
        continue;
      }

      if (googleEvent.etag !== existing.external_etag) {
        await supabase
          .from("events")
          .update({
            title: snapshot.title,
            location: snapshot.location,
            notes: snapshot.notes,
            start_at: snapshot.startAt,
            end_at: snapshot.endAt,
            is_all_day: snapshot.isAllDay,
            timezone: snapshot.timezone,
            external_etag: googleEvent.etag ?? null,
            external_updated_at: googleEvent.updated ?? null,
            sync_status: "synced",
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
        pulled++;
      }
    } catch (err) {
      errors.push(err instanceof Error ? err.message : "Pull failed");
    }
  }

  return { pulled, conflicts, errors };
}

async function markConflict(
  supabase: SupabaseClient,
  connectionId: string,
  localRow: Record<string, unknown>,
  externalSnapshot: ReturnType<typeof googleEventToSnapshot>,
  calendarName: string,
  conflicts: ConflictSummary[],
): Promise<void> {
  const eventId = localRow.id as string;
  const mosaicSnapshot = snapshotFromMosaicRow({
    title: localRow.title as string,
    location: localRow.location as string | null,
    notes: localRow.notes as string | null,
    start_at: localRow.start_at as string,
    end_at: localRow.end_at as string,
    is_all_day: localRow.is_all_day as boolean,
    timezone: localRow.timezone as string,
    external_updated_at: localRow.external_updated_at as string | null,
    external_etag: localRow.external_etag as string | null,
  });

  await supabase
    .from("events")
    .update({
      sync_status: "conflict",
      conflict_payload: {
        mosaic: mosaicSnapshot,
        external: externalSnapshot,
        provider: "google",
      },
    })
    .eq("id", eventId);

  await writeSyncLog(supabase, {
    connectionId,
    direction: "pull",
    entityType: "event",
    entityId: eventId,
    action: "conflict",
  });

  conflicts.push({
    eventId,
    calendarId: localRow.calendar_id as string,
    calendarName,
    title: (localRow.title as string) ?? "(No title)",
    provider: "google",
  });
}
