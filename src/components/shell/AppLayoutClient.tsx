"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ViewNav } from "@/components/shell/ViewNav";
import { WeekStrip } from "@/components/shell/WeekStrip";
import { ControlBar } from "@/components/shell/ControlBar";
import { parseDateParam } from "@/lib/calendar/date-params";

function isFullScreenRoute(pathname: string): boolean {
  return (
    pathname.startsWith("/calendars") ||
    pathname.startsWith("/events") ||
    pathname.startsWith("/invites")
  );
}

function AppLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedDate = parseDateParam(searchParams.get("date") ?? undefined);
  const fullScreen = isFullScreenRoute(pathname);
  const showWeekStrip =
    !fullScreen &&
    (pathname.startsWith("/day") || pathname.startsWith("/month"));

  if (fullScreen) {
    return (
      <div className="mx-auto flex min-h-full w-full max-w-md flex-col">
        <main className="flex flex-1 flex-col">{children}</main>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col">
      <ViewNav selectedDate={selectedDate} />
      {showWeekStrip ? <WeekStrip selectedDate={selectedDate} /> : null}
      <ControlBar selectedDate={selectedDate} />
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}

export function AppLayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="mx-auto min-h-full max-w-md bg-background" />}>
      <AppLayoutInner>{children}</AppLayoutInner>
    </Suspense>
  );
}
