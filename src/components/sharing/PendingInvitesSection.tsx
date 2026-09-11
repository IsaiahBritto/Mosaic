import { createClient } from "@/lib/supabase/server";
import { getCalendarInviteName } from "@/lib/repositories/members.repository";
import { getPendingInvitesForUser } from "@/lib/services/sharing.service";
import { PendingInvitesBanner } from "@/components/sharing/PendingInvitesBanner";

export async function PendingInvitesSection() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return null;
  }

  const invites = await getPendingInvitesForUser(supabase, user.email);

  return (
    <PendingInvitesBanner
      invites={invites.map((invite) => ({
        token: invite.invite_token,
        calendarName: getCalendarInviteName(invite),
        role: invite.role,
      }))}
    />
  );
}
