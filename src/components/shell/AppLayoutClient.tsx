"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ViewNav } from "@/components/shell/ViewNav";
import { WeekStrip } from "@/components/shell/WeekStrip";
import { ControlBar } from "@/components/shell/ControlBar";
import { CollapsibleControlBar } from "@/components/shell/CollapsibleControlBar";
import { TimezoneSync } from "@/components/shell/TimezoneSync";
import { parseDateParam } from "@/lib/calendar/date-params";
import { useScrollCollapse } from "@/hooks/useScrollCollapse";

function isFullScreenRoute(pathname: string): boolean {
  return (
    pathname.startsWith("/calendars") ||
    pathname.startsWith("/events") ||
    pathname.startsWith("/invites") ||
    pathname.startsWith("/mosaic")
  );
}

function AppLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedDate = parseDateParam(searchParams.get("date") ?? undefined);
  const fullScreen = isFullScreenRoute(pathname);
  const isDay = pathname.startsWith("/day");
  const isMonth = pathname.startsWith("/month");
  const isYear = pathname.startsWith("/year");
  const { collapsed, onScroll } = useScrollCollapse();

  if (fullScreen) {
    return (
      <div className="mx-auto flex min-h-full w-full max-w-md flex-col">
        <main className="flex flex-1 flex-col">{children}</main>
      </div>
    );
  }

  if (isDay) {
    return (
      <div className="mx-auto flex h-dvh w-full max-w-md flex-col">
        <header className="sticky top-0 z-20 shrink-0 bg-background">
          <ViewNav selectedDate={selectedDate} />
          <WeekStrip selectedDate={selectedDate} />
          <CollapsibleControlBar selectedDate={selectedDate} collapsed={collapsed} />
        </header>
        <main
          className="flex flex-1 flex-col overflow-y-auto"
          onScroll={onScroll}
        >
          {children}
        </main>
      </div>
    );
  }

  if (isMonth) {
    return (
      <div className="mx-auto flex min-h-full w-full max-w-md flex-col">
        <ViewNav selectedDate={selectedDate} />
        <main className="flex flex-1 flex-col">{children}</main>
      </div>
    );
  }

  if (isYear) {
    return (
      <div className="mx-auto flex min-h-full w-full max-w-md flex-col">
        <ViewNav selectedDate={selectedDate} />
        <ControlBar selectedDate={selectedDate} variant="minimal" />
        <main className="flex flex-1 flex-col">{children}</main>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col">
      <ViewNav selectedDate={selectedDate} />
      <ControlBar selectedDate={selectedDate} />
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}

export function AppLayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="mx-auto min-h-full max-w-md bg-background" />}>
      <TimezoneSync />
      <AppLayoutInner>{children}</AppLayoutInner>
    </Suspense>
  );
}
