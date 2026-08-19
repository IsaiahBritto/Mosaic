import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getInviteDetails } from "@/lib/services/sharing.service";
import { InviteAcceptCard } from "@/components/sharing/InviteAcceptCard";
import { AppHeader } from "@/components/shell/AppHeader";

type InvitePageProps = {
  params: Promise<{ token: string }>;
};

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?invite=${token}`);
  }

  const invite = await getInviteDetails(supabase, token);
  if (!invite || invite.invite_status !== "pending") {
    notFound();
  }

  const emailMismatch =
    Boolean(user.email) &&
    invite.invited_email?.toLowerCase() !== user.email?.toLowerCase();

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title="Invite" exitHref="/month" saveLabel="" />
      <InviteAcceptCard
        token={token}
        calendarName={invite.calendars.name}
        role={invite.role}
        emailMismatch={emailMismatch}
        invitedEmail={invite.invited_email ?? undefined}
        userEmail={user.email}
      />
    </div>
  );
}
