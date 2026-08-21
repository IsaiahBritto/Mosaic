"use client";

import { PeriodNav } from "@/components/shell/PeriodNav";
import { ViewNavTabs } from "@/components/shell/ViewNav";

type CalendarViewNavProps = {
  dateParam: string;
  displayTimezone: string;
  mode: "month" | "week" | "year";
};

export function CalendarViewNav({
  dateParam,
  displayTimezone,
  mode,
}: CalendarViewNavProps) {
  return (
    <>
      <ViewNavTabs dateParam={dateParam} />
      <PeriodNav
        dateParam={dateParam}
        displayTimezone={displayTimezone}
        mode={mode}
      />
    </>
  );
}
