"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { AvailabilityDisplayProvider } from "@/components/calendar/AvailabilityDisplayContext";
import { CalendarShellHeader } from "@/components/shell/CalendarShellHeader";
import { ViewNav } from "@/components/shell/ViewNav";
import { CalendarViewNav } from "@/components/shell/CalendarViewNav";
import { ControlBar } from "@/components/shell/ControlBar";
import { ShellLayoutProvider } from "@/components/shell/ShellLayoutProvider";
import { TimezoneSync } from "@/components/shell/TimezoneSync";
import { resolveCalendarDateParam } from "@/lib/calendar/timezone";
import type { AvailabilityDisplayMode, ShellLayout } from "@/lib/actions/views";

function isFullScreenRoute(pathname: string): boolean {
  return (
    pathname.startsWith("/calendars") ||
    pathname.startsWith("/events") ||
    pathname.startsWith("/invites") ||
    pathname.startsWith("/mosaic")
  );
}

type AppLayoutInnerProps = {
  children: React.ReactNode;
  displayTimezone: string;
  displayName: string;
};

function AppLayoutInner({
  children,
  displayTimezone,
  displayName,
}: AppLayoutInnerProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { dateParam, selectedDate } = resolveCalendarDateParam(
    searchParams.get("date") ?? undefined,
    displayTimezone,
  );
  const fullScreen = isFullScreenRoute(pathname);
  const isWeek = pathname.startsWith("/week");
  const isMonth = pathname.startsWith("/month");
  const isYear = pathname.startsWith("/year");

  if (fullScreen) {
    return (
      <div className="mx-auto flex min-h-full w-full max-w-md flex-col">
        <main className="flex flex-1 flex-col">{children}</main>
      </div>
    );
  }

  if (isWeek) {
    return (
      <div className="mx-auto flex h-dvh w-full max-w-md flex-col">
        <CalendarShellHeader dateParam={dateParam} displayName={displayName} />
        <main className="flex min-h-0 flex-1 flex-col">{children}</main>
      </div>
    );
  }

  if (isMonth) {
    return (
      <div className="mx-auto flex h-dvh w-full max-w-md flex-col">
        <CalendarShellHeader dateParam={dateParam} displayName={displayName} />
        <main className="flex min-h-0 flex-1 flex-col">{children}</main>
      </div>
    );
  }

  if (isYear) {
    return (
      <div className="mx-auto flex h-dvh w-full max-w-md flex-col">
        <CalendarShellHeader dateParam={dateParam} displayName={displayName}>
          <CalendarViewNav
            dateParam={dateParam}
            displayTimezone={displayTimezone}
            mode="year"
          />
        </CalendarShellHeader>
        <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">{children}</main>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col">
      <ViewNav dateParam={dateParam} />
      <ControlBar selectedDate={selectedDate} displayTimezone={displayTimezone} />
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}

type AppLayoutClientProps = {
  children: React.ReactNode;
  displayTimezone: string;
  availabilityDisplayMode: AvailabilityDisplayMode;
  shellLayout: ShellLayout;
  displayName: string;
};

export function AppLayoutClient({
  children,
  displayTimezone,
  availabilityDisplayMode,
  shellLayout,
  displayName,
}: AppLayoutClientProps) {
  return (
    <Suspense fallback={<div className="mx-auto min-h-full max-w-md bg-background" />}>
      <TimezoneSync />
      <ShellLayoutProvider initialLayout={shellLayout}>
        <AvailabilityDisplayProvider initialMode={availabilityDisplayMode}>
          <AppLayoutInner displayTimezone={displayTimezone} displayName={displayName}>
            {children}
          </AppLayoutInner>
        </AvailabilityDisplayProvider>
      </ShellLayoutProvider>
    </Suspense>
  );
}
