import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { deleteAppleConnection } from "@/lib/integrations/apple/disconnect";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { connectionId?: string };
  if (!body.connectionId) {
    return NextResponse.json({ error: "connectionId required" }, { status: 400 });
  }

  try {
    await deleteAppleConnection(supabase, body.connectionId, user.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Disconnect failed" },
      { status: 500 },
    );
  }
}
