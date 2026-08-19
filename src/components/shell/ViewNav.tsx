"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  shiftCalendarDateParam,
  withCalendarDateParam,
} from "@/lib/calendar/timezone";
import { cn } from "@/lib/utils/cn";

type ViewNavProps = {
  dateParam: string;
  displayTimezone: string;
};

const VIEWS = [
  { key: "month", label: "Month", path: "/month" },
  { key: "day", label: "Day", path: "/day" },
  { key: "year", label: "Year", path: "/year" },
] as const;

function getCarouselViews(activeIndex: number) {
  const prevIndex = (activeIndex + VIEWS.length - 1) % VIEWS.length;
  const nextIndex = (activeIndex + 1) % VIEWS.length;

  return [
    { view: VIEWS[prevIndex], slot: "prev" as const },
    { view: VIEWS[activeIndex], slot: "active" as const },
    { view: VIEWS[nextIndex], slot: "next" as const },
  ];
}

export function ViewNav({ dateParam, displayTimezone }: ViewNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const isMonth = pathname.startsWith("/month");
  const isYear = pathname.startsWith("/year");

  const activeIndex = isMonth ? 0 : isYear ? 2 : 1;
  const carouselViews = getCarouselViews(activeIndex);

  function shiftAndNavigate(unit: "day" | "week" | "month" | "year", delta: number) {
    const next = shiftCalendarDateParam(dateParam, unit, delta, displayTimezone);
    const params = new URLSearchParams(searchParams.toString());
    params.set("date", next);
    router.push(`${pathname}?${params.toString()}`);
  }

  function handlePrevious() {
    shiftAndNavigate(isYear ? "year" : isMonth ? "month" : "day", -1);
  }

  function handleNext() {
    shiftAndNavigate(isYear ? "year" : isMonth ? "month" : "day", 1);
  }

  return (
    <nav className="flex items-center gap-2 px-4 py-3 text-xs font-medium uppercase tracking-widest">
      <button
        type="button"
        onClick={handlePrevious}
        className="shrink-0 px-1 text-text-secondary hover:text-text-primary"
        aria-label="Previous"
      >
        &lt;
      </button>

      <div className="grid flex-1 grid-cols-3">
        {carouselViews.map(({ view, slot }) => (
          <Link
            key={view.key}
            href={withCalendarDateParam(view.path, dateParam)}
            className={cn(
              "text-center transition-colors duration-300",
              slot === "active"
                ? "text-text-primary font-bold"
                : "text-text-secondary hover:text-text-primary",
            )}
          >
            {view.label}
          </Link>
        ))}
      </div>

      <button
        type="button"
        onClick={handleNext}
        className="shrink-0 px-1 text-text-secondary hover:text-text-primary"
        aria-label="Next"
      >
        &gt;
      </button>
    </nav>
  );
}
