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

export type CalendarInviteSummary = {
  name: string;
  owner_id: string;
};

export type CalendarInviteDetails = {
  id: string;
  name: string;
  owner_id: string;
};

export type CalendarMemberWithCalendarSummary = CalendarMemberRow & {
  calendars: CalendarInviteSummary | null;
};

export type CalendarMemberWithCalendarDetails = CalendarMemberRow & {
  calendars: CalendarInviteDetails | null;
};

export function getCalendarInviteName(
  invite: { calendars: { name: string } | null },
): string {
  return invite.calendars?.name?.trim() || "Shared calendar";
}

export async function insertPendingInvite(
  supabase: SupabaseClient,
  calendarId: string,
  email: string,
  role: "editor" | "viewer",
  friendUserId?: string | null,
): Promise<CalendarMemberRow> {
  const { data, error } = await supabase
    .from("calendar_members")
    .insert({
      calendar_id: calendarId,
      invited_email: email.toLowerCase(),
      role,
      invite_status: "pending",
      user_id: friendUserId ?? null,
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
): Promise<CalendarMemberWithCalendarDetails | null> {
  const { data, error } = await supabase
    .from("calendar_members")
    .select("*, calendars(id, name, owner_id)")
    .eq("invite_token", token)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as CalendarMemberWithCalendarDetails | null) ?? null;
}

export async function acceptInviteByToken(
  supabase: SupabaseClient,
  token: string,
  _userId: string,
  _userEmail: string,
): Promise<string> {
  const { data, error } = await supabase.rpc("accept_calendar_invite", {
    p_token: token,
  });

  if (error) {
    if (error.message.includes("Email mismatch")) {
      throw new Error("Email mismatch");
    }
    if (error.message.includes("Invite not found")) {
      throw new Error("Invite not found");
    }
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Invite not found");
  }

  return data as string;
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
): Promise<CalendarMemberWithCalendarSummary[]> {
  const { data, error } = await supabase
    .from("calendar_members")
    .select("*, calendars(name, owner_id)")
    .eq("invited_email", email.toLowerCase())
    .eq("invite_status", "pending");

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as CalendarMemberWithCalendarSummary[];
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

export type CalendarMemberDisplay = {
  memberId: string;
  userId: string;
  displayName: string;
  role: CalendarRole;
  isOwner: boolean;
};

export async function fetchMemberById(
  supabase: SupabaseClient,
  memberId: string,
): Promise<CalendarMemberRow | null> {
  const { data, error } = await supabase
    .from("calendar_members")
    .select("*")
    .eq("id", memberId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as CalendarMemberRow | null) ?? null;
}

export async function fetchAcceptedMembersForCalendar(
  supabase: SupabaseClient,
  calendarId: string,
  ownerId: string,
): Promise<CalendarMemberDisplay[]> {
  const { data, error } = await supabase
    .from("calendar_members")
    .select(
      "id, user_id, role, profile:profiles!calendar_members_user_id_fkey(id, display_name)",
    )
    .eq("calendar_id", calendarId)
    .eq("invite_status", "accepted")
    .not("user_id", "is", null);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? [])
    .filter((row) => row.user_id != null)
    .map((row) => {
      const profileRaw = row.profile as
        | { id: string; display_name: string }
        | { id: string; display_name: string }[]
        | null;
      const profile = Array.isArray(profileRaw) ? profileRaw[0] : profileRaw;
      const userId = row.user_id as string;
      const isOwner = userId === ownerId;
      return {
        memberId: row.id as string,
        userId,
        displayName: profile?.display_name?.trim() || "Member",
        role: row.role as CalendarRole,
        isOwner,
      };
    });
}

export async function countAcceptedNonOwnerMembers(
  supabase: SupabaseClient,
  calendarId: string,
  ownerId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("calendar_members")
    .select("id", { count: "exact", head: true })
    .eq("calendar_id", calendarId)
    .eq("invite_status", "accepted")
    .neq("user_id", ownerId);

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
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

export async function updateMemberDisplayOverrides(
  supabase: SupabaseClient,
  userId: string,
  calendarId: string,
  overrides: { name?: string; colorHex?: string },
): Promise<void> {
  const payload: Record<string, string | null> = {};
  if (overrides.name !== undefined) {
    payload.name_override = overrides.name;
  }
  if (overrides.colorHex !== undefined) {
    payload.color_hex_override = overrides.colorHex;
  }

  const { error } = await supabase
    .from("calendar_members")
    .update(payload)
    .eq("calendar_id", calendarId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function clearMemberDisplayOverrides(
  supabase: SupabaseClient,
  userId: string,
  calendarId: string,
): Promise<void> {
  const { error } = await supabase
    .from("calendar_members")
    .update({
      name_override: null,
      color_hex_override: null,
    })
    .eq("calendar_id", calendarId)
    .eq("user_id", userId);

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

export async function removeCalendarFromVisiblePreferences(
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
  if (!current.includes(calendarId)) {
    return;
  }

  await supabase
    .from("user_preferences")
    .update({
      visible_calendar_ids: current.filter((id) => id !== calendarId),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);
}
