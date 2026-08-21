"use client";

import type { ReactNode } from "react";
import { PeriodNav } from "@/components/shell/PeriodNav";
import { ViewNavTabs } from "@/components/shell/ViewNav";
import { useShellLayout } from "@/components/shell/ShellLayoutProvider";
import { splitShellBlocks } from "@/lib/shell/layout-order";

type MonthViewShellProps = {
  dateParam: string;
  displayTimezone: string;
  calendar: ReactNode | null;
  calendars: ReactNode;
  events: ReactNode | null;
};

export function MonthViewShell({
  dateParam,
  displayTimezone,
  calendar,
  calendars,
  events,
}: MonthViewShellProps) {
  const { layout } = useShellLayout();

  const { pinned, scrollable } = splitShellBlocks(layout, {
    tabs: <ViewNavTabs dateParam={dateParam} />,
    period: (
      <PeriodNav
        dateParam={dateParam}
        displayTimezone={displayTimezone}
        mode="month"
      />
    ),
    calendar: calendar ?? null,
    calendars,
    events: events ?? null,
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 bg-background">{pinned}</div>
      <div className="flex-1 overflow-y-auto">{scrollable}</div>
    </div>
  );
}
