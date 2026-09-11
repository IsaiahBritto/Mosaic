import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listGoogleCalendarsForConnection } from "@/lib/services/google-integration.service";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const connectionId = new URL(request.url).searchParams.get("connectionId");
  if (!connectionId) {
    return NextResponse.json({ error: "connectionId required" }, { status: 400 });
  }

  try {
    const result = await listGoogleCalendarsForConnection(
      supabase,
      user.id,
      connectionId,
    );
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to list calendars",
      },
      { status: 500 },
    );
  }
}
