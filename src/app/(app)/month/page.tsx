import { redirect } from "next/navigation";
import { endOfMonth, startOfMonth, endOfDay, startOfDay } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { getCalendarsPageData } from "@/lib/services/calendar.service";
import { MonthCalendarSection } from "@/components/calendar/MonthCalendarSection";
import { MonthGrid } from "@/components/calendar/MonthGrid";
import { StatusLegend } from "@/components/calendar/StatusLegend";
import { parseDateParam } from "@/lib/calendar/date-params";
import { computeRangeAvailability } from "@/lib/calendar/availability";
import { getExpandedEventsInRange } from "@/lib/queries/events";

type MonthPageProps = {
  searchParams: Promise<{ date?: string }>;
};

export default async function MonthPage({ searchParams }: MonthPageProps) {
  const params = await searchParams;
  const selectedDate = parseDateParam(params.date);

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
  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);
  const gridStart = startOfDay(monthStart);
  gridStart.setDate(gridStart.getDate() - gridStart.getDay());
  const gridEnd = endOfDay(monthEnd);
  gridEnd.setDate(gridEnd.getDate() + (6 - gridEnd.getDay()));

  const events = await getExpandedEventsInRange(gridStart, gridEnd);
  const availabilityMap = computeRangeAvailability(
    gridStart,
    gridEnd,
    events,
    timezone,
  );

  const hasVisibleCalendars = visibleIds.length > 0;

  return (
    <div className="flex flex-1 flex-col">
      {hasVisibleCalendars ? (
        <>
          <MonthGrid
            monthDate={selectedDate}
            selectedDate={selectedDate}
            availabilityMap={availabilityMap}
            timezone={timezone}
          />
          <StatusLegend />
        </>
      ) : (
        <div className="px-4 py-8 text-center text-sm text-text-secondary">
          Select calendars to show
        </div>
      )}

      <MonthCalendarSection
        groups={groups}
        visibleIds={visibleIds}
        selectedDate={selectedDate}
      />
    </div>
  );
}
