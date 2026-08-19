import type { SupabaseClient } from "@supabase/supabase-js";
import type { CalendarRole } from "@/types/calendar";

export type CalendarMemberRow = {
  id: string;
  calendar_id: string;
  user_id: string | null;
  role: CalendarRole;
  invited_email: string | null;
  invite_status: string;
  invite_token: string;
  created_at: string;
};

export async function insertPendingInvite(
  supabase: SupabaseClient,
  calendarId: string,
  email: string,
  role: "editor" | "viewer",
): Promise<CalendarMemberRow> {
  const { data, error } = await supabase
    .from("calendar_members")
    .insert({
      calendar_id: calendarId,
      invited_email: email.toLowerCase(),
      role,
      invite_status: "pending",
      user_id: null,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create invite");
  }

  return data as CalendarMemberRow;
}

export async function fetchInviteByToken(
  supabase: SupabaseClient,
  token: string,
): Promise<
  (CalendarMemberRow & {
    calendars: { id: string; name: string; owner_id: string };
  }) | null
> {
  const { data, error } = await supabase
    .from("calendar_members")
    .select("*, calendars(id, name, owner_id)")
    .eq("invite_token", token)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as
    | (CalendarMemberRow & {
        calendars: { id: string; name: string; owner_id: string };
      })
    | null;
}

export async function acceptInviteByToken(
  supabase: SupabaseClient,
  token: string,
  userId: string,
  userEmail: string,
): Promise<string> {
  const invite = await fetchInviteByToken(supabase, token);
  if (!invite || invite.invite_status !== "pending") {
    throw new Error("Invite not found");
  }

  if (invite.invited_email?.toLowerCase() !== userEmail.toLowerCase()) {
    throw new Error("Email mismatch");
  }

  const { error } = await supabase
    .from("calendar_members")
    .update({
      user_id: userId,
      invite_status: "accepted",
    })
    .eq("invite_token", token);

  if (error) {
    throw new Error(error.message);
  }

  await supabase
    .from("calendars")
    .update({ type: "shared" })
    .eq("id", invite.calendar_id);

  return invite.calendar_id;
}

export async function declineInviteByToken(
  supabase: SupabaseClient,
  token: string,
): Promise<void> {
  const { error } = await supabase
    .from("calendar_members")
    .update({ invite_status: "declined" })
    .eq("invite_token", token);

  if (error) {
    throw new Error(error.message);
  }
}

export async function fetchPendingInvitesForEmail(
  supabase: SupabaseClient,
  email: string,
): Promise<
  Array<
    CalendarMemberRow & {
      calendars: { name: string; owner_id: string };
    }
  >
> {
  const { data, error } = await supabase
    .from("calendar_members")
    .select("*, calendars(name, owner_id)")
    .eq("invited_email", email.toLowerCase())
    .eq("invite_status", "pending");

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as Array<
    CalendarMemberRow & {
      calendars: { name: string; owner_id: string };
    }
  >;
}

export async function fetchSentInvitesForCalendar(
  supabase: SupabaseClient,
  calendarId: string,
): Promise<CalendarMemberRow[]> {
  const { data, error } = await supabase
    .from("calendar_members")
    .select("*")
    .eq("calendar_id", calendarId)
    .eq("invite_status", "pending");

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as CalendarMemberRow[];
}

export async function removeMemberById(
  supabase: SupabaseClient,
  memberId: string,
): Promise<void> {
  const { error } = await supabase
    .from("calendar_members")
    .delete()
    .eq("id", memberId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function addCalendarToVisiblePreferences(
  supabase: SupabaseClient,
  userId: string,
  calendarId: string,
): Promise<void> {
  const { data } = await supabase
    .from("user_preferences")
    .select("visible_calendar_ids")
    .eq("user_id", userId)
    .maybeSingle();

  const current = (data?.visible_calendar_ids as string[] | undefined) ?? [];
  if (current.includes(calendarId)) {
    return;
  }

  await supabase
    .from("user_preferences")
    .update({
      visible_calendar_ids: [...current, calendarId],
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);
}
