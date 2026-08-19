"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { formatDateParam, shiftDate, withDateParam } from "@/lib/calendar/date-params";
import { cn } from "@/lib/utils/cn";

type ViewNavProps = {
  selectedDate: Date;
};

export function ViewNav({ selectedDate }: ViewNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const dateParam = formatDateParam(selectedDate);

  const isDay = pathname.startsWith("/day");
  const isMonth = pathname.startsWith("/month");
  const isYear = pathname.startsWith("/year");

  function shiftAndNavigate(unit: "day" | "week" | "month" | "year", delta: number) {
    const next = formatDateParam(shiftDate(selectedDate, unit, delta));
    const params = new URLSearchParams(searchParams.toString());
    params.set("date", next);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <nav className="flex items-center justify-between px-4 py-3 text-xs font-medium uppercase tracking-widest">
      <Link
        href={withDateParam("/month", selectedDate)}
        className={cn(
          "transition-colors",
          isMonth ? "text-text-primary font-bold" : "text-text-secondary",
        )}
      >
        Month
      </Link>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => shiftAndNavigate(isYear ? "year" : isMonth ? "month" : "day", -1)}
          className="text-text-secondary hover:text-text-primary"
          aria-label="Previous"
        >
          &lt;
        </button>
        <Link
          href={`/day?date=${dateParam}`}
          className={cn(
            "min-w-[4rem] text-center transition-colors",
            isDay ? "text-text-primary font-bold" : "text-text-secondary",
          )}
        >
          Day
        </Link>
        <button
          type="button"
          onClick={() => shiftAndNavigate(isYear ? "year" : isMonth ? "month" : "day", 1)}
          className="text-text-secondary hover:text-text-primary"
          aria-label="Next"
        >
          &gt;
        </button>
      </div>

      <Link
        href={withDateParam("/year", selectedDate)}
        className={cn(
          "transition-colors",
          isYear ? "text-text-primary font-bold" : "text-text-secondary",
        )}
      >
        Year
      </Link>
    </nav>
  );
}
