import type { SupabaseClient } from "@supabase/supabase-js";
import { canEncryptSecrets, decryptSecret, encryptSecret } from "@/lib/integrations/crypto";
import type { CalendarConnection, SyncResult } from "@/lib/integrations/types";

export async function fetchConnectionsForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<CalendarConnection[]> {
  const { data, error } = await supabase
    .from("calendar_connections")
    .select(
      "id, user_id, provider, provider_account_id, provider_account_email, last_sync_at, last_sync_status, last_sync_error",
    )
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => ({
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

  const { data, error } = await supabase
    .from("calendar_connections")
    .upsert(
      {
        user_id: userId,
        provider: "apple",
        provider_account_id: appleId.toLowerCase(),
        provider_account_email: appleId.toLowerCase(),
        credentials_encrypted: encryptSecret(appPassword),
        caldav_url: caldavUrl,
        caldav_username: appleId.toLowerCase(),
        last_sync_status: "ok",
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
): Promise<SyncResult> {
  await supabase
    .from("calendar_connections")
    .update({ last_sync_status: "syncing", last_sync_error: null })
    .eq("id", connection.id);

  // Provider-specific sync is implemented when credentials are configured.
  // v1 scaffold records successful no-op sync for connected accounts.
  const result: SyncResult = {
    connectionId: connection.id,
    provider: connection.provider,
    pulled: 0,
    pushed: 0,
    errors: [],
  };

  if (connection.provider === "google" && !canEncryptSecrets()) {
    result.errors.push("TOKEN_ENCRYPTION_KEY missing");
  }

  await supabase
    .from("calendar_connections")
    .update({
      last_sync_at: new Date().toISOString(),
      last_sync_status: result.errors.length ? "error" : "ok",
      last_sync_error: result.errors[0] ?? null,
    })
    .eq("id", connection.id);

  return result;
}

export async function syncAllConnections(
  supabase: SupabaseClient,
): Promise<SyncResult[]> {
  const { data, error } = await supabase
    .from("calendar_connections")
    .select(
      "id, user_id, provider, provider_account_id, provider_account_email, last_sync_at, last_sync_status, last_sync_error",
    );

  if (error) {
    throw new Error(error.message);
  }

  const results: SyncResult[] = [];
  for (const row of data ?? []) {
    results.push(
      await runConnectionSync(supabase, {
        id: row.id,
        userId: row.user_id,
        provider: row.provider,
        providerAccountId: row.provider_account_id,
        providerAccountEmail: row.provider_account_email,
        lastSyncAt: row.last_sync_at,
        lastSyncStatus: row.last_sync_status,
        lastSyncError: row.last_sync_error,
      }),
    );
  }

  return results;
}

export { decryptSecret };
