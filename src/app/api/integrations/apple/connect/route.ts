import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { saveAppleConnection } from "@/lib/integrations/sync.service";
import { canEncryptSecrets } from "@/lib/integrations/crypto";

const connectSchema = z.object({
  appleId: z.string().email(),
  appPassword: z.string().min(8),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canEncryptSecrets()) {
    return NextResponse.json(
      { error: "google_token_failed" },
      { status: 500 },
    );
  }

  const body = connectSchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: "VALIDATION_ERROR" }, { status: 400 });
  }

  try {
    const connectionId = await saveAppleConnection(
      supabase,
      user.id,
      body.data.appleId,
      body.data.appPassword,
    );
    return NextResponse.json({ connectionId });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to connect Apple";
    const status = message === "apple_invalid_credentials" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
