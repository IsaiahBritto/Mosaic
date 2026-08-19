import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { exchangeGoogleCode, isGoogleOAuthConfigured } from "@/lib/integrations/google/oauth";
import { saveGoogleConnection } from "@/lib/integrations/sync.service";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  if (!code || !state || !isGoogleOAuthConfigured()) {
    return NextResponse.redirect(new URL("/calendars?error=google_auth_failed", baseUrl));
  }

  let userId: string;
  try {
    const parsed = JSON.parse(Buffer.from(state, "base64url").toString("utf8")) as {
      userId: string;
    };
    userId = parsed.userId;
  } catch {
    return NextResponse.redirect(new URL("/calendars?error=invalid_state", baseUrl));
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.id !== userId) {
    return NextResponse.redirect(new URL("/login", baseUrl));
  }

  try {
    const tokens = await exchangeGoogleCode(code);
    await saveGoogleConnection(
      supabase,
      user.id,
      user.email ?? "google-user",
      user.email ?? user.id,
      tokens.accessToken,
      tokens.refreshToken,
      tokens.expiresIn,
    );
    return NextResponse.redirect(new URL("/calendars?connected=google", baseUrl));
  } catch {
    return NextResponse.redirect(new URL("/calendars?error=google_token_failed", baseUrl));
  }
}
