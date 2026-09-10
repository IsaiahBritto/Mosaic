import type { SupabaseClient } from "@supabase/supabase-js";
import type { IntegrationProvider } from "@/lib/integrations/types";

export type ConnectionRow = {
  id: string;
  user_id: string;
  provider: IntegrationProvider;
  provider_account_id: string;
  provider_account_email: string;
  access_token_encrypted: string | null;
  refresh_token_encrypted: string | null;
  token_expires_at: string | null;
  last_sync_at: string | null;
  last_sync_status: "ok" | "error" | "syncing" | null;
  last_sync_error: string | null;
  sync_lock_until: string | null;
};

export type LinkedCalendarRow = {
  id: string;
  owner_id: string;
  name: string;
  color_hex: string;
  type: string;
  source: string;
  connection_id: string | null;
  external_calendar_id: string | null;
  sync_enabled: boolean;
  external_sync_token: string | null;
  external_calendar_access_role: string | null;
};

export async function fetchConnectionById(
  supabase: SupabaseClient,
  connectionId: string,
): Promise<ConnectionRow | null> {
  const { data, error } = await supabase
    .from("calendar_connections")
    .select(
      "id, user_id, provider, provider_account_id, provider_account_email, access_token_encrypted, refresh_token_encrypted, token_expires_at, last_sync_at, last_sync_status, last_sync_error, sync_lock_until",
    )
    .eq("id", connectionId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as ConnectionRow | null;
}

export async function fetchConnectionsForUserId(
  supabase: SupabaseClient,
  userId: string,
  provider?: IntegrationProvider,
): Promise<ConnectionRow[]> {
  let query = supabase
    .from("calendar_connections")
    .select(
      "id, user_id, provider, provider_account_id, provider_account_email, access_token_encrypted, refresh_token_encrypted, token_expires_at, last_sync_at, last_sync_status, last_sync_error, sync_lock_until",
    )
    .eq("user_id", userId);

  if (provider) {
    query = query.eq("provider", provider);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ConnectionRow[];
}

export async function fetchLinkedCalendarsForConnection(
  supabase: SupabaseClient,
  connectionId: string,
): Promise<LinkedCalendarRow[]> {
  const { data, error } = await supabase
    .from("calendars")
    .select(
      "id, owner_id, name, color_hex, type, source, connection_id, external_calendar_id, sync_enabled, external_sync_token, external_calendar_access_role",
    )
    .eq("connection_id", connectionId)
    .eq("sync_enabled", true);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as LinkedCalendarRow[];
}

export async function acquireSyncLock(
  supabase: SupabaseClient,
  connectionId: string,
  ttlMs = 5 * 60 * 1000,
): Promise<boolean> {
  const now = new Date();
  const lockUntil = new Date(now.getTime() + ttlMs).toISOString();

  const { data: existing } = await supabase
    .from("calendar_connections")
    .select("sync_lock_until")
    .eq("id", connectionId)
    .maybeSingle();

  const currentLock = existing?.sync_lock_until as string | null | undefined;
  if (currentLock && new Date(currentLock) > now) {
    return false;
  }

  const { error } = await supabase
    .from("calendar_connections")
    .update({ sync_lock_until: lockUntil })
    .eq("id", connectionId);

  if (error) {
    throw new Error(error.message);
  }

  return true;
}

export async function releaseSyncLock(
  supabase: SupabaseClient,
  connectionId: string,
): Promise<void> {
  const { error } = await supabase
    .from("calendar_connections")
    .update({ sync_lock_until: null })
    .eq("id", connectionId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function writeSyncLog(
  supabase: SupabaseClient,
  entry: {
    connectionId: string;
    direction?: "pull" | "push";
    entityType?: "event" | "calendar";
    entityId?: string;
    externalId?: string;
    action: "create" | "update" | "delete" | "skip" | "conflict";
    detail?: Record<string, unknown>;
  },
): Promise<void> {
  const { error } = await supabase.from("sync_log").insert({
    connection_id: entry.connectionId,
    direction: entry.direction ?? null,
    entity_type: entry.entityType ?? null,
    entity_id: entry.entityId ?? null,
    external_id: entry.externalId ?? null,
    action: entry.action,
    detail: entry.detail ?? null,
  });

  if (error) {
    console.error("sync_log write failed:", error.message);
  }
}

export async function fetchLastLinkedSyncDate(
  supabase: SupabaseClient,
  userId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("user_preferences")
    .select("last_linked_sync_date")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data?.last_linked_sync_date as string | null | undefined) ?? null;
}

export async function updateLastLinkedSyncDate(
  supabase: SupabaseClient,
  userId: string,
  date: string,
): Promise<void> {
  const { error } = await supabase
    .from("user_preferences")
    .update({ last_linked_sync_date: date, updated_at: new Date().toISOString() })
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }
}
