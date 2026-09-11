import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  listGoogleCalendarsForConnection,
  mapSelectedCalendars,
  saveSelectedGoogleCalendars,
} from "@/lib/services/google-integration.service";
import { syncGoogleConnection } from "@/lib/integrations/google/sync";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    connectionId?: string;
    selectedCalendarIds?: string[];
  };

  if (!body.connectionId || !body.selectedCalendarIds?.length) {
    return NextResponse.json(
      { error: "connectionId and selectedCalendarIds required" },
      { status: 400 },
    );
  }

  try {
    const remote = await listGoogleCalendarsForConnection(
      supabase,
      user.id,
      body.connectionId,
    );
    const selected = mapSelectedCalendars(
      remote.calendars,
      body.selectedCalendarIds,
      remote.accountEmail,
    );
    const calendarIds = await saveSelectedGoogleCalendars(
      supabase,
      user.id,
      body.connectionId,
      selected,
    );

    const syncResult = await syncGoogleConnection(supabase, body.connectionId, {
      force: true,
    });

    return NextResponse.json({
      calendarIds,
      sync: syncResult,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to save selection",
      },
      { status: 500 },
    );
  }
}
