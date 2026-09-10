import type { SupabaseClient } from "@supabase/supabase-js";
import { decryptSecret, encryptSecret } from "@/lib/integrations/crypto";
import {
  fetchConnectionById,
  type ConnectionRow,
} from "@/lib/repositories/connections.repository";
import { refreshGoogleAccessToken } from "@/lib/integrations/google/oauth";

const refreshInflight = new Map<string, Promise<string>>();

export type GoogleTokens = {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string | null;
};

export async function getGoogleTokens(
  supabase: SupabaseClient,
  connectionId: string,
): Promise<GoogleTokens> {
  const connection = await fetchConnectionById(supabase, connectionId);
  if (!connection || connection.provider !== "google") {
    throw new Error("Google connection not found");
  }

  if (!connection.access_token_encrypted) {
    throw new Error("Google connection has no access token");
  }

  let accessToken = decryptSecret(connection.access_token_encrypted);
  const refreshToken = connection.refresh_token_encrypted
    ? decryptSecret(connection.refresh_token_encrypted)
    : null;
  let expiresAt = connection.token_expires_at;

  const needsRefresh =
    expiresAt != null && new Date(expiresAt).getTime() < Date.now() + 60_000;

  if (needsRefresh && refreshToken) {
    accessToken = await refreshAccessTokenSingleFlight(
      supabase,
      connection,
      refreshToken,
    );
    expiresAt = connection.token_expires_at;
  }

  return { accessToken, refreshToken, expiresAt };
}

async function refreshAccessTokenSingleFlight(
  supabase: SupabaseClient,
  connection: ConnectionRow,
  refreshToken: string,
): Promise<string> {
  const existing = refreshInflight.get(connection.id);
  if (existing) {
    return existing;
  }

  const promise = (async () => {
    try {
      const refreshed = await refreshGoogleAccessToken(refreshToken);
      const expiresAt = new Date(
        Date.now() + refreshed.expiresIn * 1000,
      ).toISOString();

      const { error } = await supabase
        .from("calendar_connections")
        .update({
          access_token_encrypted: encryptSecret(refreshed.accessToken),
          token_expires_at: expiresAt,
          last_sync_status: "ok",
          last_sync_error: null,
        })
        .eq("id", connection.id);

      if (error) {
        throw new Error(error.message);
      }

      return refreshed.accessToken;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Token refresh failed";

      await supabase
        .from("calendar_connections")
        .update({
          last_sync_status: "error",
          last_sync_error: message.includes("invalid_grant")
            ? "token_revoked"
            : message,
        })
        .eq("id", connection.id);

      throw error;
    } finally {
      refreshInflight.delete(connection.id);
    }
  })();

  refreshInflight.set(connection.id, promise);
  return promise;
}

export async function revokeAndDeleteGoogleConnection(
  supabase: SupabaseClient,
  connectionId: string,
  userId: string,
): Promise<void> {
  const connection = await fetchConnectionById(supabase, connectionId);
  if (!connection || connection.user_id !== userId) {
    throw new Error("Connection not found");
  }

  if (connection.access_token_encrypted) {
    try {
      const token = decryptSecret(connection.access_token_encrypted);
      await fetch(
        `https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`,
        { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" } },
      );
    } catch {
      // Revocation is best-effort
    }
  }

  const { error } = await supabase
    .from("calendar_connections")
    .delete()
    .eq("id", connectionId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }
}
