"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  formatDayHeading,
  formatMonthYearHeading,
  formatYearHeading,
  getTodayCalendarDate,
  shiftCalendarDateParam,
} from "@/lib/calendar/timezone";
import { cn } from "@/lib/utils/cn";

type PeriodNavProps = {
  dateParam: string;
  displayTimezone: string;
  mode: "month" | "day" | "year";
};

function getLabel(
  dateParam: string,
  displayTimezone: string,
  mode: Exclude<PeriodNavProps["mode"], "day">,
): string {
  switch (mode) {
    case "month":
      return formatMonthYearHeading(dateParam, displayTimezone);
    case "year":
      return formatYearHeading(dateParam);
  }
}

export function PeriodNav({ dateParam, displayTimezone, mode }: PeriodNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const label =
    mode === "day" ? null : getLabel(dateParam, displayTimezone, mode);
  const todayParam = getTodayCalendarDate(displayTimezone);
  const isMonthView = pathname.startsWith("/month");
  const isAtTodayMonth =
    isMonthView &&
    dateParam === todayParam &&
    searchParams.get("select") !== "none";
  const showTodayButton = !isAtTodayMonth;

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

      <div className="flex flex-1 flex-col items-center gap-1">
        {mode === "day" ? (
          <>
            <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">
              {formatMonthYearHeading(dateParam, displayTimezone)}
            </p>
            <h2 className="text-center text-base font-bold uppercase tracking-widest text-text-primary">
              {formatDayHeading(dateParam, displayTimezone)}
            </h2>
          </>
        ) : (
          <h2 className="text-center text-sm font-bold uppercase tracking-widest text-text-primary">
            {label}
          </h2>
        )}
        {showTodayButton ? (
          <Link
            href={`/month?date=${todayParam}`}
            className={cn(
              "rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
              "text-accent transition-colors hover:bg-accent/10",
            )}
          >
            Today
          </Link>
        ) : null}
      </div>

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
