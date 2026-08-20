import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCalendarsPageData } from "@/lib/services/calendar.service";
import { MonthCalendarSection } from "@/components/calendar/MonthCalendarSection";
import { MonthGrid } from "@/components/calendar/MonthGrid";
import { StatusLegend } from "@/components/calendar/StatusLegend";
import {
  computeRangeAvailability,
  getMonthGridDates,
} from "@/lib/calendar/availability";
import { getExpandedEventsInRange } from "@/lib/queries/events";
import {
  getCalendarDayUtcRange,
  resolveCalendarDateParam,
} from "@/lib/calendar/timezone";

type MonthPageProps = {
  searchParams: Promise<{ date?: string; select?: string }>;
};

export default async function MonthPage({ searchParams }: MonthPageProps) {
  const params = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { groups, visibleIds } = await getCalendarsPageData(supabase, user.id);

  const { data: prefs } = await supabase
    .from("user_preferences")
    .select("default_timezone")
    .eq("user_id", user.id)
    .maybeSingle();

  const timezone = prefs?.default_timezone ?? "America/New_York";
  const { dateParam, selectedDate } = resolveCalendarDateParam(
    params.date,
    timezone,
  );
  const gridDates = getMonthGridDates(dateParam, timezone);
  const { start: gridStart } = getCalendarDayUtcRange(gridDates[0]!, timezone);
  const { end: gridEnd } = getCalendarDayUtcRange(gridDates.at(-1)!, timezone);

  const events = await getExpandedEventsInRange(gridStart, gridEnd);
  const availabilityMap = computeRangeAvailability(
    gridStart,
    gridEnd,
    events,
    timezone,
  );

  const hasVisibleCalendars = visibleIds.length > 0;
  const selectedDateParam =
    params.select === "none" ? undefined : dateParam;

  return (
    <div className="flex flex-1 flex-col">
      {hasVisibleCalendars ? (
        <>
          <MonthGrid
            monthDateParam={dateParam}
            selectedDateParam={selectedDateParam}
            availabilityMap={availabilityMap}
            timezone={timezone}
          />
          <StatusLegend />
        </>
      ) : null}

      <MonthCalendarSection
        groups={groups}
        visibleIds={visibleIds}
        selectedDate={selectedDate}
        showEmptyHint={!hasVisibleCalendars}
      />
    </div>
  );
}
