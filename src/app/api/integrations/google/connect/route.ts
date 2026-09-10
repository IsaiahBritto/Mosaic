import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildGoogleAuthUrl, isGoogleOAuthConfigured } from "@/lib/integrations/google/oauth";
import { createOAuthState } from "@/lib/integrations/oauth-state";

export async function GET() {
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

  try {
    const state = createOAuthState(user.id);
    const url = buildGoogleAuthUrl(state);
    return NextResponse.redirect(url);
  } catch {
    return NextResponse.redirect(
      new URL("/calendars?error=google_token_failed", baseUrl),
    );
  }
}
