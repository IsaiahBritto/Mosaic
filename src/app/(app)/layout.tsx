import { Suspense } from "react";
import { AppLayoutClient } from "@/components/shell/AppLayoutClient";
import { ToastProvider } from "@/components/ui/Toast";
import { PendingInvitesSection } from "@/components/sharing/PendingInvitesSection";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <Suspense fallback={null}>
        <PendingInvitesSection />
      </Suspense>
      <AppLayoutClient>{children}</AppLayoutClient>
    </ToastProvider>
  );
}
