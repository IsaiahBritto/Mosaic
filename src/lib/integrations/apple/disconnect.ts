import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchConnectionById } from "@/lib/repositories/connections.repository";

export async function deleteAppleConnection(
  supabase: SupabaseClient,
  connectionId: string,
  userId: string,
): Promise<void> {
  const connection = await fetchConnectionById(supabase, connectionId);
  if (!connection || connection.user_id !== userId || connection.provider !== "apple") {
    throw new Error("Connection not found");
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
