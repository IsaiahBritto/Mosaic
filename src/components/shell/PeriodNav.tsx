"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  formatFullDateHeading,
  formatMonthYearHeading,
  formatWeekdayHeading,
  formatYearHeading,
  getTodayCalendarDate,
  shiftCalendarDateParam,
} from "@/lib/calendar/timezone";
import { cn } from "@/lib/utils/cn";

type PeriodNavProps = {
  dateParam: string;
  displayTimezone: string;
  mode: "month" | "week" | "year";
};

function ChevronIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
      className={direction === "right" ? "rotate-180" : undefined}
    >
      <path
        d="M10 3L5 8L10 13"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function getLabel(
  dateParam: string,
  displayTimezone: string,
  mode: Exclude<PeriodNavProps["mode"], "week">,
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
    mode === "week" ? null : getLabel(dateParam, displayTimezone, mode);
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
        className={cn(
          "flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full",
          "text-text-secondary transition-colors hover:bg-surface hover:text-text-primary",
        )}
        aria-label="Previous"
      >
        <ChevronIcon direction="left" />
      </button>

      <div className="flex flex-1 flex-col items-center gap-1">
        {mode === "week" ? (
          <>
            <h2 className="text-center text-base font-bold uppercase tracking-widest text-text-primary">
              {formatWeekdayHeading(dateParam, displayTimezone)}
            </h2>
            <p className="text-[10px] font-medium uppercase tracking-widest text-text-secondary">
              {formatFullDateHeading(dateParam, displayTimezone)}
            </p>
          </>
        ) : (
          <h2
            className={cn(
              "text-center font-bold uppercase tracking-widest text-text-primary",
              mode === "year" ? "text-base" : "text-sm",
            )}
          >
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
            Go To Today
          </Link>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => shiftAndNavigate(1)}
        className={cn(
          "flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full",
          "text-text-secondary transition-colors hover:bg-surface hover:text-text-primary",
        )}
        aria-label="Next"
      >
        <ChevronIcon direction="right" />
      </button>
    </div>
  );
}
