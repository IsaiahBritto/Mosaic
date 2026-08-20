import { Suspense } from "react";
import { AppLayoutClient } from "@/components/shell/AppLayoutClient";
import { ToastProvider } from "@/components/ui/Toast";
import { PendingInvitesSection } from "@/components/sharing/PendingInvitesSection";
import {
  getAvailabilityDisplayModeFromPrefs,
  getDisplayTimezoneFromPrefs,
} from "@/lib/actions/views";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [displayTimezone, availabilityDisplayMode] = await Promise.all([
    getDisplayTimezoneFromPrefs(),
    getAvailabilityDisplayModeFromPrefs(),
  ]);

  return (
    <ToastProvider>
      <Suspense fallback={null}>
        <PendingInvitesSection />
      </Suspense>
      <AppLayoutClient
        displayTimezone={displayTimezone}
        availabilityDisplayMode={availabilityDisplayMode}
      >
        {children}
      </AppLayoutClient>
    </ToastProvider>
  );
}
