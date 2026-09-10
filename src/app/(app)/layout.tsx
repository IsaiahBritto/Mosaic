import { Suspense } from "react";
import { AppLayoutClient } from "@/components/shell/AppLayoutClient";
import { ToastProvider } from "@/components/ui/Toast";
import { ConflictResolutionGate } from "@/components/integrations/ConflictResolutionGate";
import { createClient } from "@/lib/supabase/server";
import { getNotificationCountForUser } from "@/lib/services/notifications.service";
import {
  getAvailabilityDisplayModeFromPrefs,
  getDisplayTimezoneFromPrefs,
  getProfileDisplayName,
  getShellLayoutFromPrefs,
} from "@/lib/actions/views";

async function getInitialNotificationCount(): Promise<number> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return 0;
  }

  return getNotificationCountForUser(supabase, user.id, user.email);
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [displayTimezone, availabilityDisplayMode, shellLayout, displayName, notificationCount] =
    await Promise.all([
      getDisplayTimezoneFromPrefs(),
      getAvailabilityDisplayModeFromPrefs(),
      getShellLayoutFromPrefs(),
      getProfileDisplayName(),
      getInitialNotificationCount(),
    ]);

  return (
    <ToastProvider>
      <Suspense fallback={null}>
        <ConflictResolutionGate />
      </Suspense>
      <AppLayoutClient
        displayTimezone={displayTimezone}
        availabilityDisplayMode={availabilityDisplayMode}
        shellLayout={shellLayout}
        displayName={displayName}
        notificationCount={notificationCount}
      >
        {children}
      </AppLayoutClient>
    </ToastProvider>
  );
}
