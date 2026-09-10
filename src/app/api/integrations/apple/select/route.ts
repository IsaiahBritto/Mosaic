import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  listAppleCalendarsForConnection,
  mapSelectedAppleCalendars,
  saveSelectedAppleCalendars,
} from "@/lib/services/apple-integration.service";
import { syncAppleConnection } from "@/lib/integrations/apple/sync";

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
    const remote = await listAppleCalendarsForConnection(
      supabase,
      user.id,
      body.connectionId,
    );
    const selected = mapSelectedAppleCalendars(remote, body.selectedCalendarIds);
    const calendarIds = await saveSelectedAppleCalendars(
      supabase,
      user.id,
      body.connectionId,
      selected,
    );

    const syncResult = await syncAppleConnection(supabase, body.connectionId, {
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
