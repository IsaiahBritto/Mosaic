import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildGoogleAuthUrl, isGoogleOAuthConfigured } from "@/lib/integrations/google/oauth";
import { createOAuthState } from "@/lib/integrations/oauth-state";
import { fetchConnectionById } from "@/lib/repositories/connections.repository";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  if (!user) {
    return NextResponse.redirect(new URL("/login", baseUrl));
  }

  if (!isGoogleOAuthConfigured()) {
    return NextResponse.redirect(
      new URL("/calendars?error=google_not_configured", baseUrl),
    );
  }

  const connectionId = new URL(request.url).searchParams.get("connectionId");
  let reconnectConnectionId: string | undefined;

  if (connectionId) {
    const connection = await fetchConnectionById(supabase, connectionId);
    if (
      !connection ||
      connection.user_id !== user.id ||
      connection.provider !== "google"
    ) {
      return NextResponse.redirect(
        new URL("/calendars?error=google_auth_failed", baseUrl),
      );
    }
    reconnectConnectionId = connection.id;
  }

  try {
    const state = createOAuthState(user.id, reconnectConnectionId);
    const url = buildGoogleAuthUrl(state);
    return NextResponse.redirect(url);
  } catch {
    return NextResponse.redirect(
      new URL("/calendars?error=google_token_failed", baseUrl),
    );
  }
}
