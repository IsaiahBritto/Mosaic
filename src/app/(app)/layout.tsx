import { Suspense } from "react";
import { AppLayoutClient } from "@/components/shell/AppLayoutClient";
import { ToastProvider } from "@/components/ui/Toast";
import { PendingInvitesSection } from "@/components/sharing/PendingInvitesSection";
import { getDisplayTimezoneFromPrefs } from "@/lib/actions/views";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const displayTimezone = await getDisplayTimezoneFromPrefs();

  return (
    <ToastProvider>
      <Suspense fallback={null}>
        <PendingInvitesSection />
      </Suspense>
      <AppLayoutClient displayTimezone={displayTimezone}>{children}</AppLayoutClient>
    </ToastProvider>
  );
}
