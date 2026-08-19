import { redirect } from "next/navigation";
import { endOfYear, startOfYear } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { computeRangeAvailability } from "@/lib/calendar/availability";
import { getExpandedEventsInRange } from "@/lib/queries/events";
import { resolveCalendarDateParam } from "@/lib/calendar/timezone";
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
  const year = Number(dateParam.slice(0, 4));
  const yearStart = startOfYear(new Date(year, 0, 1));
  const yearEnd = endOfYear(new Date(year, 0, 1));

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
        selectedDateParam={dateParam}
        availabilityMap={availabilityMap}
        timezone={timezone}
      />
    </div>
  );
}
