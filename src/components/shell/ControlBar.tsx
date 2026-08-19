"use client";

import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { formatCalendarDate } from "@/lib/calendar/timezone";
import { setDayViewMode } from "@/lib/actions/views";
import { Toggle } from "@/components/ui/Toggle";

type ControlBarProps = {
  selectedDate: Date;
  displayTimezone: string;
  defaultViewMode?: "timeline" | "agenda";
  variant?: "full" | "minimal";
};

export function ControlBar({
  selectedDate,
  displayTimezone,
  defaultViewMode = "timeline",
  variant = "full",
}: ControlBarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const dateParam = formatCalendarDate(selectedDate, displayTimezone);

  const viewParam = searchParams.get("view");
  const isAgenda =
    pathname.startsWith("/day") &&
    (viewParam === "agenda" ||
      (!viewParam && defaultViewMode === "agenda"));

  function handleToggle(checked: boolean) {
    const mode = checked ? "agenda" : "timeline";
    const params = new URLSearchParams(searchParams.toString());
    params.set("date", dateParam);

    if (checked) {
      params.set("view", "agenda");
    } else {
      params.delete("view");
    }

    startTransition(async () => {
      await setDayViewMode(mode);
      router.push(`${pathname}?${params.toString()}`);
      router.refresh();
    });
  }

  const showViewToggle = pathname.startsWith("/day");
  const showCalendarsLink = variant === "full";

  return (
    <div className="flex items-center justify-between border-y border-surface px-4 py-3">
      {showViewToggle ? (
        <Toggle
          checked={isAgenda}
          onChange={handleToggle}
          label=""
          className={isPending ? "opacity-50" : undefined}
        />
      ) : (
        <div className="w-12" />
      )}

      {showCalendarsLink ? (
        <Link href={`/calendars?date=${dateParam}`} className="flex flex-col items-center">
          <span className="text-sm font-bold uppercase tracking-wide text-text-secondary">
            Calendars
          </span>
          <span className="text-[10px] uppercase tracking-wide text-accent">
            Select to show
          </span>
        </Link>
      ) : (
        <div className="flex-1" />
      )}

      <Link
        href={`/events/new?date=${dateParam}`}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-surface text-lg text-accent ring-1 ring-accent/30"
        aria-label="New event"
      >
        +
      </Link>
    </div>
  );
}
