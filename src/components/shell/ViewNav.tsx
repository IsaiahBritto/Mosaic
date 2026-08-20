"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { withCalendarDateParam } from "@/lib/calendar/timezone";
import { CALENDAR_PALETTE } from "@/lib/theme/colors";
import { cn } from "@/lib/utils/cn";

type ViewNavProps = {
  dateParam: string;
};

const VIEWS = [
  { key: "week", label: "Week", path: "/week" },
  { key: "month", label: "Month", path: "/month" },
  { key: "year", label: "Year", path: "/year" },
] as const;

export function ViewNav({ dateParam }: ViewNavProps) {
  const pathname = usePathname();
  const isMosaic = pathname.startsWith("/mosaic");

  return (
    <nav className="px-4 py-3 text-xs font-medium uppercase tracking-widest">
      <div className="mb-2 flex justify-start">
        <Link
          href={withCalendarDateParam("/mosaic", dateParam)}
          className={cn(
            "inline-flex items-center gap-0.5 transition-opacity hover:opacity-90",
            isMosaic ? "opacity-100" : "opacity-80",
          )}
          aria-label="View my mosaic"
        >
          {"Mosaic".split("").map((letter, index) => (
            <span
              key={`${letter}-${index}`}
              className="text-sm font-extrabold"
              style={{ color: CALENDAR_PALETTE[index % CALENDAR_PALETTE.length] }}
            >
              {letter}
            </span>
          ))}
        </Link>
      </div>

      <div className="grid grid-cols-3">
        {VIEWS.map((view) => {
          const isActive = pathname.startsWith(view.path);

          return (
            <Link
              key={view.key}
              href={withCalendarDateParam(view.path, dateParam)}
              className={cn(
                "text-center transition-colors duration-300",
                isActive
                  ? "font-bold text-text-primary"
                  : "text-text-secondary hover:text-text-primary",
              )}
            >
              {view.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
