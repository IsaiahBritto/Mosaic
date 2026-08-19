import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { buildYearMosaicDays } from "@/lib/calendar/mosaic";
import { getExpandedEventsInRange } from "@/lib/queries/events";
import {
  getCalendarDayUtcRange,
  resolveCalendarDateParam,
  withCalendarDateParam,
} from "@/lib/calendar/timezone";
import { MosaicGrid } from "@/components/calendar/MosaicGrid";
import { AppHeader } from "@/components/shell/AppHeader";

type MosaicPageProps = {
  searchParams: Promise<{ date?: string }>;
};

export default async function MosaicPage({ searchParams }: MosaicPageProps) {
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
  const { start: yearStart } = getCalendarDayUtcRange(`${year}-01-01`, timezone);
  const { end: yearEnd } = getCalendarDayUtcRange(`${year}-12-31`, timezone);

  const events = await getExpandedEventsInRange(yearStart, yearEnd);
  const days = buildYearMosaicDays(year, events, timezone);

  return (
    <div className="flex h-dvh flex-col">
      <AppHeader
        title="My Mosaic"
        exitHref={withCalendarDateParam("/month", dateParam)}
        hideAction
      />
      <MosaicGrid days={days} />
    </div>
  );
}
