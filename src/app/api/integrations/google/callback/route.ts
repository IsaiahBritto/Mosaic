import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  exchangeGoogleCode,
  isGoogleOAuthConfigured,
} from "@/lib/integrations/google/oauth";
import { parseGoogleIdToken } from "@/lib/integrations/google/id-token";
import { verifyOAuthState } from "@/lib/integrations/oauth-state";
import { syncGoogleConnection } from "@/lib/integrations/google/sync";
import { saveGoogleConnection } from "@/lib/integrations/sync.service";
import { fetchConnectionById } from "@/lib/repositories/connections.repository";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  if (!code || !state || !isGoogleOAuthConfigured()) {
    return NextResponse.redirect(
      new URL("/calendars?error=google_auth_failed", baseUrl),
    );
  }

  const verified = verifyOAuthState(state);
  if (!verified) {
    return NextResponse.redirect(
      new URL("/calendars?error=invalid_state", baseUrl),
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.id !== verified.userId) {
    return NextResponse.redirect(new URL("/login", baseUrl));
  }

  try {
    const tokens = await exchangeGoogleCode(code);
    let accountId = user.id;
    let accountEmail = user.email ?? "google-user";

    if (tokens.idToken) {
      const parsed = parseGoogleIdToken(tokens.idToken);
      accountId = parsed.sub;
      if (parsed.email) {
        accountEmail = parsed.email;
      }
    }

    if (verified.reconnectConnectionId) {
      const existing = await fetchConnectionById(
        supabase,
        verified.reconnectConnectionId,
      );

      if (
        !existing ||
        existing.user_id !== user.id ||
        existing.provider !== "google"
      ) {
        return NextResponse.redirect(
          new URL("/calendars?error=google_auth_failed", baseUrl),
        );
      }

      if (existing.provider_account_id !== accountId) {
        return NextResponse.redirect(
          new URL("/calendars?error=google_account_mismatch", baseUrl),
        );
      }

      const connectionId = await saveGoogleConnection(
        supabase,
        user.id,
        accountEmail,
        accountId,
        tokens.accessToken,
        tokens.refreshToken,
        tokens.expiresIn,
      );

      await syncGoogleConnection(supabase, connectionId, { force: true });

      return NextResponse.redirect(
        new URL(
          `/calendars?reconnected=google&connectionId=${connectionId}`,
          baseUrl,
        ),
      );
    }

    const connectionId = await saveGoogleConnection(
      supabase,
      user.id,
      accountEmail,
      accountId,
      tokens.accessToken,
      tokens.refreshToken,
      tokens.expiresIn,
    );

    return NextResponse.redirect(
      new URL(
        `/calendars?connected=google&connectionId=${connectionId}`,
        baseUrl,
      ),
    );
  } catch {
    return NextResponse.redirect(
      new URL("/calendars?error=google_token_failed", baseUrl),
    );
  }
}
