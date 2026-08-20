import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { computeRangeAvailability } from "@/lib/calendar/availability";
import { getExpandedEventsInRange } from "@/lib/queries/events";
import {
  getCalendarDayUtcRange,
  getTodayCalendarDate,
  resolveCalendarDateParam,
} from "@/lib/calendar/timezone";
import { YearGrid } from "@/components/calendar/YearGrid";

type YearPageProps = {
  searchParams: Promise<{ date?: string }>;
};

export default async function YearPage({ searchParams }: YearPageProps) {
  const params = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: prefs } = await supabase
    .from("user_preferences")
    .select("default_timezone")
    .eq("user_id", user.id)
    .maybeSingle();

  const timezone = prefs?.default_timezone ?? "America/New_York";
  const { dateParam } = resolveCalendarDateParam(params.date, timezone);
  const todayDateParam = getTodayCalendarDate(timezone);
  const year = Number(dateParam.slice(0, 4));
  const { start: yearStart } = getCalendarDayUtcRange(`${year}-01-01`, timezone);
  const { end: yearEnd } = getCalendarDayUtcRange(`${year}-12-31`, timezone);

  const events = await getExpandedEventsInRange(yearStart, yearEnd);
  const availabilityMap = computeRangeAvailability(
    yearStart,
    yearEnd,
    events,
    timezone,
  );

  return (
    <div className="flex flex-1 flex-col overflow-y-auto pt-2">
      <YearGrid
        year={year}
        todayDateParam={todayDateParam}
        availabilityMap={availabilityMap}
        timezone={timezone}
      />
    </div>
  );
}
