"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { CalendarGroup } from "@/types/calendar";
import { setCalendarVisibility } from "@/lib/actions/calendars";
import { CalendarList } from "@/components/calendar/CalendarList";
import { useToast } from "@/components/ui/Toast";
import { formatDateParam } from "@/lib/calendar/date-params";
import { MosaicIcon } from "@/components/calendar/MosaicIcon";

type MonthCalendarSectionProps = {
  groups: CalendarGroup[];
  visibleIds: string[];
  selectedDate: Date;
  showEmptyHint?: boolean;
};

export function MonthCalendarSection({
  groups,
  visibleIds,
  selectedDate,
  showEmptyHint = false,
}: MonthCalendarSectionProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const dateParam = formatDateParam(selectedDate);

  function handleToggle(calendarId: string, visible: boolean) {
    startTransition(async () => {
      const result = await setCalendarVisibility({ calendarId, visible });
      if (!result.success) {
        showToast(result.message, "error");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="mt-auto border-t border-surface px-4 py-4">
      <div className="relative mb-4 flex items-center justify-center">
        <MosaicIcon
          href={`/mosaic?date=${dateParam}`}
          className="absolute left-0"
        />
        <div className="text-center">
          <p className="text-sm font-bold uppercase tracking-wide text-text-secondary">
            Calendars
          </p>
          <p className="text-[10px] uppercase tracking-wide text-accent">
            Select to show
          </p>
        </div>
        <Link
          href={`/events/new?date=${dateParam}`}
          className="absolute right-0 flex h-9 w-9 items-center justify-center rounded-full bg-surface text-lg text-accent ring-1 ring-accent/30"
          aria-label="New event"
        >
          +
        </Link>
      </div>

      <CalendarList
        groups={groups}
        visibleIds={visibleIds}
        onToggle={handleToggle}
        compact
      />

      {showEmptyHint ? (
        <p className="mt-4 text-center text-sm text-text-secondary">
          Select calendars to show
        </p>
      ) : null}

      {isPending ? (
        <p className="mt-2 text-center text-xs text-text-secondary">Updating…</p>
      ) : null}

      <Link
        href="/calendars"
        className="mt-4 block rounded-full bg-surface py-3 text-center text-sm text-accent ring-1 ring-accent/20"
      >
        New Calendar
      </Link>
    </div>
  );
}
