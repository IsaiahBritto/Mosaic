import type { SupabaseClient } from "@supabase/supabase-js";
import { formatInTimeZone } from "date-fns-tz";
import { syncConnectionByProvider } from "@/lib/integrations/registry";
import { canEncryptSecrets, decryptSecret, encryptSecret } from "@/lib/integrations/crypto";
import type { CalendarConnection, SyncResult } from "@/lib/integrations/types";
import type { ConflictSummary, ResyncResult } from "@/lib/integrations/sync-types";
import {
  fetchConnectionsForUserId,
  fetchLastLinkedSyncDate,
  updateLastLinkedSyncDate,
} from "@/lib/repositories/connections.repository";

export function shouldRunDailySync(
  lastSyncDate: string | null,
  now: Date,
): boolean {
  const nyToday = formatInTimeZone(now, "America/New_York", "yyyy-MM-dd");
  const nyHour = Number(formatInTimeZone(now, "America/New_York", "H"));
  return nyHour === 0 && lastSyncDate !== nyToday;
}

export async function fetchConnectionsForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<CalendarConnection[]> {
  const rows = await fetchConnectionsForUserId(supabase, userId);
  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    provider: row.provider,
    providerAccountId: row.provider_account_id,
    providerAccountEmail: row.provider_account_email,
    lastSyncAt: row.last_sync_at,
    lastSyncStatus: row.last_sync_status,
    lastSyncError: row.last_sync_error,
  }));
}

export async function saveGoogleConnection(
  supabase: SupabaseClient,
  userId: string,
  accountEmail: string,
  accountId: string,
  accessToken: string,
  refreshToken?: string,
  expiresIn?: number,
): Promise<string> {
  if (!canEncryptSecrets()) {
    throw new Error("TOKEN_ENCRYPTION_KEY is not configured");
  }

  const expiresAt = expiresIn
    ? new Date(Date.now() + expiresIn * 1000).toISOString()
    : null;

  const { data, error } = await supabase
    .from("calendar_connections")
    .upsert(
      {
        user_id: userId,
        provider: "google",
        provider_account_id: accountId,
        provider_account_email: accountEmail,
        access_token_encrypted: encryptSecret(accessToken),
        refresh_token_encrypted: refreshToken
          ? encryptSecret(refreshToken)
          : null,
        token_expires_at: expiresAt,
        last_sync_status: "ok",
        last_sync_error: null,
      },
      { onConflict: "user_id,provider,provider_account_id" },
    )
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to save Google connection");
  }

  return data.id;
}

export async function saveAppleConnection(
  supabase: SupabaseClient,
  userId: string,
  appleId: string,
  appPassword: string,
  caldavUrl = "https://caldav.icloud.com",
): Promise<string> {
  if (!canEncryptSecrets()) {
    throw new Error("TOKEN_ENCRYPTION_KEY is not configured");
  }

  const { validateAppleCredentials } = await import(
    "@/lib/integrations/apple/discover"
  );
  const validation = await validateAppleCredentials(
    appleId,
    appPassword,
    caldavUrl,
  );

  if (!validation.ok) {
    throw new Error(validation.error);
  }

  const resolvedUrl = validation.resolvedUrl || caldavUrl;

  const { data, error } = await supabase
    .from("calendar_connections")
    .upsert(
      {
        user_id: userId,
        provider: "apple",
        provider_account_id: appleId.toLowerCase(),
        provider_account_email: appleId.toLowerCase(),
        credentials_encrypted: encryptSecret(appPassword),
        caldav_url: resolvedUrl,
        caldav_username: appleId.toLowerCase(),
        last_sync_status: "ok",
        last_sync_error: null,
      },
      { onConflict: "user_id,provider,provider_account_id" },
    )
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to save Apple connection");
  }

  return data.id;
}

export async function runConnectionSync(
  supabase: SupabaseClient,
  connection: CalendarConnection,
  options?: { force?: boolean },
): Promise<SyncResult & { conflicts?: ConflictSummary[] }> {
  return syncConnectionByProvider(
    supabase,
    connection.id,
    connection.provider,
    options,
  );
}

export async function resyncAllLinkedCalendarsForUser(
  supabase: SupabaseClient,
  userId: string,
  options?: { force?: boolean; dailyGate?: boolean },
): Promise<ResyncResult> {
  const now = new Date();
  const lastDate = await fetchLastLinkedSyncDate(supabase, userId);

  if (options?.dailyGate && !shouldRunDailySync(lastDate, now)) {
    return { synced: 0, pulled: 0, pushed: 0, conflicts: [], errors: [] };
  }

  const connections = await fetchConnectionsForUser(supabase, userId);
  const result: ResyncResult = {
    synced: 0,
    pulled: 0,
    pushed: 0,
    conflicts: [],
    errors: [],
  };

  for (const connection of connections) {
    const syncResult = await runConnectionSync(supabase, connection, {
      force: options?.force ?? true,
    });
    result.synced++;
    result.pulled += syncResult.pulled;
    result.pushed += syncResult.pushed;
    result.conflicts.push(...(syncResult.conflicts ?? []));
    result.errors.push(...syncResult.errors);
  }

  if (options?.dailyGate) {
    const nyToday = formatInTimeZone(now, "America/New_York", "yyyy-MM-dd");
    await updateLastLinkedSyncDate(supabase, userId, nyToday);
  }

  return result;
}

export async function syncAllConnections(
  supabase: SupabaseClient,
  options?: { dailyGate?: boolean },
): Promise<(SyncResult & { conflicts?: ConflictSummary[]; userId?: string })[]> {
  const { data, error } = await supabase
    .from("calendar_connections")
    .select(
      "id, user_id, provider, provider_account_id, provider_account_email, last_sync_at, last_sync_status, last_sync_error",
    );

  if (error) {
    throw new Error(error.message);
  }

  const results: (SyncResult & {
    conflicts?: ConflictSummary[];
    userId?: string;
  })[] = [];

  const userIds = new Set<string>();

  for (const row of data ?? []) {
    if (options?.dailyGate) {
      const lastDate = await fetchLastLinkedSyncDate(supabase, row.user_id);
      if (!shouldRunDailySync(lastDate, new Date())) {
        continue;
      }
    }

    const syncResult = await runConnectionSync(supabase, {
      id: row.id,
      userId: row.user_id,
      provider: row.provider,
      providerAccountId: row.provider_account_id,
      providerAccountEmail: row.provider_account_email,
      lastSyncAt: row.last_sync_at,
      lastSyncStatus: row.last_sync_status,
      lastSyncError: row.last_sync_error,
    });

    results.push({ ...syncResult, userId: row.user_id });
    userIds.add(row.user_id);
  }

  if (options?.dailyGate) {
    const nyToday = formatInTimeZone(
      new Date(),
      "America/New_York",
      "yyyy-MM-dd",
    );
    for (const userId of userIds) {
      await updateLastLinkedSyncDate(supabase, userId, nyToday);
    }
  }

  return results;
}

export { decryptSecret };
