"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  formatDayHeading,
  formatMonthYearHeading,
  formatYearHeading,
  shiftCalendarDateParam,
} from "@/lib/calendar/timezone";

type PeriodNavProps = {
  dateParam: string;
  displayTimezone: string;
  mode: "month" | "day" | "year";
};

function getLabel(
  dateParam: string,
  displayTimezone: string,
  mode: PeriodNavProps["mode"],
): string {
  switch (mode) {
    case "month":
      return formatMonthYearHeading(dateParam, displayTimezone);
    case "year":
      return formatYearHeading(dateParam);
    case "day":
      return formatDayHeading(dateParam, displayTimezone);
  }
}

export function PeriodNav({ dateParam, displayTimezone, mode }: PeriodNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const label = getLabel(dateParam, displayTimezone, mode);

  function shiftAndNavigate(delta: number) {
    const next = shiftCalendarDateParam(dateParam, mode, delta, displayTimezone);
    const params = new URLSearchParams(searchParams.toString());
    params.set("date", next);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-2 px-4 py-3">
      <button
        type="button"
        onClick={() => shiftAndNavigate(-1)}
        className="shrink-0 px-1 text-sm text-text-secondary hover:text-text-primary"
        aria-label="Previous"
      >
        &lt;
      </button>

      <h2 className="flex-1 text-center text-sm font-bold uppercase tracking-widest text-text-primary">
        {label}
      </h2>

      <button
        type="button"
        onClick={() => shiftAndNavigate(1)}
        className="shrink-0 px-1 text-sm text-text-secondary hover:text-text-primary"
        aria-label="Next"
      >
        &gt;
      </button>
    </div>
  );
}
