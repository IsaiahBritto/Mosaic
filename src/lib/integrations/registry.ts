import type { SupabaseClient } from "@supabase/supabase-js";
import { syncAppleConnection } from "@/lib/integrations/apple/sync";
import { syncGoogleConnection } from "@/lib/integrations/google/sync";
import type { IntegrationProvider } from "@/lib/integrations/types";
import type { SyncResult } from "@/lib/integrations/types";
import type { ConflictSummary } from "@/lib/integrations/sync-types";

export async function syncConnectionByProvider(
  supabase: SupabaseClient,
  connectionId: string,
  provider: IntegrationProvider,
  options?: { force?: boolean },
): Promise<SyncResult & { conflicts?: ConflictSummary[] }> {
  if (provider === "google") {
    return syncGoogleConnection(supabase, connectionId, options);
  }

  if (provider === "apple") {
    return syncAppleConnection(supabase, connectionId, options);
  }

  return {
    connectionId,
    provider,
    pulled: 0,
    pushed: 0,
    errors: ["Provider sync not implemented"],
  };
}
