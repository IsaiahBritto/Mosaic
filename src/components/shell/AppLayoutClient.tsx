"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ViewNav } from "@/components/shell/ViewNav";
import { PeriodNav } from "@/components/shell/PeriodNav";
import { WeekStrip } from "@/components/shell/WeekStrip";
import { ControlBar } from "@/components/shell/ControlBar";
import { CollapsibleControlBar } from "@/components/shell/CollapsibleControlBar";
import { TimezoneSync } from "@/components/shell/TimezoneSync";
import { resolveCalendarDateParam } from "@/lib/calendar/timezone";
import { useScrollCollapse } from "@/hooks/useScrollCollapse";

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
};

function AppLayoutInner({ children, displayTimezone }: AppLayoutInnerProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { dateParam, selectedDate } = resolveCalendarDateParam(
    searchParams.get("date") ?? undefined,
    displayTimezone,
  );
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
          <ViewNav dateParam={dateParam} />
          <PeriodNav
            dateParam={dateParam}
            displayTimezone={displayTimezone}
            mode="day"
          />
          <WeekStrip
            dateParam={dateParam}
            selectedDate={selectedDate}
            displayTimezone={displayTimezone}
          />
          <CollapsibleControlBar
            selectedDate={selectedDate}
            displayTimezone={displayTimezone}
            collapsed={collapsed}
          />
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
        <ViewNav dateParam={dateParam} />
        <PeriodNav
          dateParam={dateParam}
          displayTimezone={displayTimezone}
          mode="month"
        />
        <main className="flex flex-1 flex-col">{children}</main>
      </div>
    );
  }

  if (isYear) {
    return (
      <div className="mx-auto flex min-h-full w-full max-w-md flex-col">
        <ViewNav dateParam={dateParam} />
        <PeriodNav
          dateParam={dateParam}
          displayTimezone={displayTimezone}
          mode="year"
        />
        <main className="flex flex-1 flex-col">{children}</main>
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
};

export function AppLayoutClient({
  children,
  displayTimezone,
}: AppLayoutClientProps) {
  return (
    <Suspense fallback={<div className="mx-auto min-h-full max-w-md bg-background" />}>
      <TimezoneSync />
      <AppLayoutInner displayTimezone={displayTimezone}>{children}</AppLayoutInner>
    </Suspense>
  );
}
