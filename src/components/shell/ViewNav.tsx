"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { withCalendarDateParam } from "@/lib/calendar/timezone";
import { cn } from "@/lib/utils/cn";

type ViewNavProps = {
  dateParam: string;
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

export function ViewNav({ dateParam }: ViewNavProps) {
  const pathname = usePathname();

  const isMonth = pathname.startsWith("/month");
  const isYear = pathname.startsWith("/year");

  const activeIndex = isMonth ? 0 : isYear ? 2 : 1;
  const carouselViews = getCarouselViews(activeIndex);

  return (
    <nav className="px-4 py-3 text-xs font-medium uppercase tracking-widest">
      <div className="grid grid-cols-3">
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
    </nav>
  );
}
