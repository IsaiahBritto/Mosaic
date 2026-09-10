import type { SupabaseClient } from "@supabase/supabase-js";
import { decryptSecret } from "@/lib/integrations/crypto";
import { CalDavClient, type CalDavCredentials } from "@/lib/integrations/apple/caldav-client";
import { fetchConnectionById } from "@/lib/repositories/connections.repository";

export async function getCalDavClientForConnection(
  supabase: SupabaseClient,
  connectionId: string,
): Promise<CalDavClient> {
  const credentials = await getCalDavCredentials(supabase, connectionId);
  return new CalDavClient(credentials);
}

export async function getCalDavCredentials(
  supabase: SupabaseClient,
  connectionId: string,
): Promise<CalDavCredentials> {
  const connection = await fetchConnectionById(supabase, connectionId);
  if (!connection || connection.provider !== "apple") {
    throw new Error("Apple connection not found");
  }

  const { data, error } = await supabase
    .from("calendar_connections")
    .select("credentials_encrypted, caldav_url, caldav_username, provider_account_email")
    .eq("id", connectionId)
    .single();

  if (error || !data?.credentials_encrypted) {
    throw new Error("Apple credentials not found");
  }

  return {
    username: data.caldav_username ?? data.provider_account_email,
    password: decryptSecret(data.credentials_encrypted),
    baseUrl: data.caldav_url ?? "https://caldav.icloud.com",
  };
}
