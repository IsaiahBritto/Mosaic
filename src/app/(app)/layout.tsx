import { Suspense } from "react";
import { AppLayoutClient } from "@/components/shell/AppLayoutClient";
import { ToastProvider } from "@/components/ui/Toast";
import { PendingInvitesSection } from "@/components/sharing/PendingInvitesSection";
import {
  getAvailabilityDisplayModeFromPrefs,
  getDisplayTimezoneFromPrefs,
  getProfileDisplayName,
  getShellLayoutFromPrefs,
} from "@/lib/actions/views";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [displayTimezone, availabilityDisplayMode, shellLayout, displayName] =
    await Promise.all([
      getDisplayTimezoneFromPrefs(),
      getAvailabilityDisplayModeFromPrefs(),
      getShellLayoutFromPrefs(),
      getProfileDisplayName(),
    ]);

  return (
    <ToastProvider>
      <Suspense fallback={null}>
        <PendingInvitesSection />
      </Suspense>
      <AppLayoutClient
        displayTimezone={displayTimezone}
        availabilityDisplayMode={availabilityDisplayMode}
        shellLayout={shellLayout}
        displayName={displayName}
      >
        {children}
      </AppLayoutClient>
    </ToastProvider>
  );
}
