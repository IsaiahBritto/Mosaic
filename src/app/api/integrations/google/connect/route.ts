import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildGoogleAuthUrl, isGoogleOAuthConfigured } from "@/lib/integrations/google/oauth";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"));
  }

  if (!isGoogleOAuthConfigured()) {
    return NextResponse.redirect(
      new URL("/calendars?error=google_not_configured", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
    );
  }

  const state = Buffer.from(JSON.stringify({ userId: user.id })).toString("base64url");
  const url = buildGoogleAuthUrl(state);
  return NextResponse.redirect(url);
}
