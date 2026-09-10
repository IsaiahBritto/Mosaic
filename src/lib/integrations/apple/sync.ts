import { randomUUID } from "crypto";
import { addDays } from "date-fns";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getCalDavClientForConnection } from "@/lib/integrations/apple/credentials";
import {
  mosaicEventToIcs,
  parseIcsEvents,
  snapshotFromMosaicRow,
} from "@/lib/integrations/apple/ical-map";
import type { SyncResult } from "@/lib/integrations/types";
import type { ConflictSummary, EventSnapshot } from "@/lib/integrations/sync-types";
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
  external_metadata: { pendingDelete?: boolean; sequence?: number } | null;
  updated_at: string;
};

type AppleLinkedCalendar = LinkedCalendarRow & {
  external_caldav_path: string | null;
};

function isPendingDelete(row: PendingEventRow): boolean {
  return row.external_metadata?.pendingDelete === true;
}

function getSequence(row: PendingEventRow): number {
  return row.external_metadata?.sequence ?? 0;
}

export async function syncAppleConnection(
  supabase: SupabaseClient,
  connectionId: string,
  options?: { force?: boolean },
): Promise<SyncResult & { conflicts: ConflictSummary[] }> {
  const result: SyncResult & { conflicts: ConflictSummary[] } = {
    connectionId,
    provider: "apple",
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
    const client = await getCalDavClientForConnection(supabase, connectionId);
    const calendars = await fetchAppleLinkedCalendars(supabase, connectionId);

    for (const calendar of calendars) {
      try {
        const pushResult = await pushCalendarEvents(
          supabase,
          client,
          connectionId,
          calendar,
        );
        result.pushed += pushResult.pushed;
        result.conflicts.push(...pushResult.conflicts);
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
      error instanceof Error ? error.message : "Apple sync failed";
    const isAuthError =
      message.includes("401") ||
      message.includes("403") ||
      message.includes("apple_invalid_credentials");

    result.errors.push(message);
    await supabase
      .from("calendar_connections")
      .update({
        last_sync_status: "error",
        last_sync_error: isAuthError ? "token_revoked" : message,
      })
      .eq("id", connectionId);
  } finally {
    await releaseSyncLock(supabase, connectionId);
  }

  return result;
}

async function fetchAppleLinkedCalendars(
  supabase: SupabaseClient,
  connectionId: string,
): Promise<AppleLinkedCalendar[]> {
  const { data, error } = await supabase
    .from("calendars")
    .select(
      "id, owner_id, name, color_hex, type, source, connection_id, external_calendar_id, sync_enabled, external_sync_token, external_calendar_access_role, external_caldav_path",
    )
    .eq("connection_id", connectionId)
    .eq("sync_enabled", true);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as AppleLinkedCalendar[];
}

async function pushCalendarEvents(
  supabase: SupabaseClient,
  client: Awaited<ReturnType<typeof getCalDavClientForConnection>>,
  connectionId: string,
  calendar: AppleLinkedCalendar,
): Promise<{ pushed: number; errors: string[]; conflicts: ConflictSummary[] }> {
  if (calendar.external_calendar_access_role === "reader") {
    return { pushed: 0, errors: [], conflicts: [] };
  }

  const caldavPath = calendar.external_caldav_path;
  if (!caldavPath) {
    return { pushed: 0, errors: ["Missing CalDAV path"], conflicts: [] };
  }

  const { data, error } = await supabase
    .from("events")
    .select(
      "id, calendar_id, created_by, title, location, notes, start_at, end_at, is_all_day, timezone, external_event_id, external_etag, external_updated_at, sync_status, external_metadata, updated_at",
    )
    .eq("calendar_id", calendar.id)
    .eq("sync_status", "pending_push");

  if (error) {
    return { pushed: 0, errors: [error.message], conflicts: [] };
  }

  let pushed = 0;
  const errors: string[] = [];
  const conflicts: ConflictSummary[] = [];

  for (const row of (data ?? []) as PendingEventRow[]) {
    try {
      if (isPendingDelete(row)) {
        if (row.external_event_id) {
          await client.deleteEvent(
            caldavPath,
            row.external_event_id,
            row.external_etag,
          );
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

      const uid = row.external_event_id ?? randomUUID();
      const sequence = row.external_event_id ? getSequence(row) + 1 : 0;
      const ics = mosaicEventToIcs({
        uid,
        title: row.title,
        location: row.location,
        notes: row.notes,
        startAt: row.start_at,
        endAt: row.end_at,
        isAllDay: row.is_all_day,
        timezone: row.timezone,
        sequence,
      });

      try {
        const putResult = await client.putEvent(
          caldavPath,
          uid,
          ics,
          row.external_event_id ? row.external_etag : null,
        );

        await supabase
          .from("events")
          .update({
            external_event_id: uid,
            external_etag: putResult.etag ?? row.external_etag,
            external_updated_at: new Date().toISOString(),
            sync_status: "synced",
            source: "apple",
            external_metadata: { sequence },
            updated_at: new Date().toISOString(),
          })
          .eq("id", row.id);

        await writeSyncLog(supabase, {
          connectionId,
          direction: "push",
          entityType: "event",
          entityId: row.id,
          externalId: uid,
          action: row.external_event_id ? "update" : "create",
        });

        pushed++;
      } catch (err) {
        if (err instanceof Error && err.message.includes("412")) {
          const remoteEvents = await client.fetchEvents(
            caldavPath,
            addDays(new Date(), -30),
            addDays(new Date(), 365),
          );
          const remote = remoteEvents
            .flatMap((block) =>
              parseIcsEvents(block.ics).map((e) => ({
                ...e,
                etag: block.etag,
              })),
            )
            .find((e) => e.uid === uid);

          if (remote) {
            await markConflict(
              supabase,
              connectionId,
              row,
              remote.snapshot,
              remote.etag,
              calendar.name,
              conflicts,
            );
          }
          errors.push("412 Precondition Failed");
        } else {
          throw err;
        }
      }
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

  return { pushed, errors, conflicts };
}

async function pullCalendarEvents(
  supabase: SupabaseClient,
  client: Awaited<ReturnType<typeof getCalDavClientForConnection>>,
  connectionId: string,
  calendar: AppleLinkedCalendar,
): Promise<{ pulled: number; conflicts: ConflictSummary[]; errors: string[] }> {
  const caldavPath = calendar.external_caldav_path;
  if (!caldavPath) {
    return { pulled: 0, conflicts: [], errors: ["Missing CalDAV path"] };
  }

  const now = new Date();
  const rangeStart = addDays(now, -30);
  const rangeEnd = addDays(now, 365);

  let blocks: Awaited<ReturnType<typeof client.fetchEvents>>;
  try {
    blocks = await client.fetchEvents(caldavPath, rangeStart, rangeEnd);
  } catch (err) {
    return {
      pulled: 0,
      conflicts: [],
      errors: [err instanceof Error ? err.message : "Pull failed"],
    };
  }

  const remoteByUid = new Map<
    string,
    { snapshot: EventSnapshot; etag: string | null }
  >();

  for (const block of blocks) {
    for (const parsed of parseIcsEvents(block.ics)) {
      remoteByUid.set(parsed.uid, {
        snapshot: {
          ...parsed.snapshot,
          externalEtag: block.etag,
        },
        etag: block.etag,
      });
    }
  }

  let pulled = 0;
  const conflicts: ConflictSummary[] = [];
  const errors: string[] = [];

  for (const [uid, remote] of remoteByUid) {
    try {
      const { data: existing } = await supabase
        .from("events")
        .select("*")
        .eq("calendar_id", calendar.id)
        .eq("external_event_id", uid)
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
          title: remote.snapshot.title,
          location: remote.snapshot.location,
          notes: remote.snapshot.notes,
          start_at: remote.snapshot.startAt,
          end_at: remote.snapshot.endAt,
          is_all_day: remote.snapshot.isAllDay,
          timezone: remote.snapshot.timezone,
          source: "apple",
          external_event_id: uid,
          external_etag: remote.etag,
          external_updated_at: new Date().toISOString(),
          sync_status: "synced",
        });
        pulled++;
        continue;
      }

      if (existing.sync_status === "pending_push") {
        if (remote.etag && remote.etag !== existing.external_etag) {
          await markConflict(
            supabase,
            connectionId,
            existing as PendingEventRow,
            remote.snapshot,
            remote.etag,
            calendar.name,
            conflicts,
          );
        }
        continue;
      }

      if (remote.etag !== existing.external_etag) {
        await supabase
          .from("events")
          .update({
            title: remote.snapshot.title,
            location: remote.snapshot.location,
            notes: remote.snapshot.notes,
            start_at: remote.snapshot.startAt,
            end_at: remote.snapshot.endAt,
            is_all_day: remote.snapshot.isAllDay,
            timezone: remote.snapshot.timezone,
            external_etag: remote.etag,
            external_updated_at: new Date().toISOString(),
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

  const { data: localEvents } = await supabase
    .from("events")
    .select("id, external_event_id, sync_status")
    .eq("calendar_id", calendar.id)
    .not("external_event_id", "is", null);

  for (const local of localEvents ?? []) {
    if (
      local.external_event_id &&
      !remoteByUid.has(local.external_event_id) &&
      local.sync_status !== "pending_push" &&
      local.sync_status !== "conflict"
    ) {
      await supabase.from("events").delete().eq("id", local.id);
      pulled++;
    }
  }

  return { pulled, conflicts, errors };
}

async function markConflict(
  supabase: SupabaseClient,
  connectionId: string,
  localRow: PendingEventRow | Record<string, unknown>,
  externalSnapshot: EventSnapshot,
  externalEtag: string | null,
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

  const externalWithMeta: EventSnapshot = {
    ...externalSnapshot,
    externalEtag: externalEtag ?? externalSnapshot.externalEtag ?? null,
  };

  await supabase
    .from("events")
    .update({
      sync_status: "conflict",
      conflict_payload: {
        mosaic: mosaicSnapshot,
        external: externalWithMeta,
        provider: "apple",
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
    provider: "apple",
  });
}
