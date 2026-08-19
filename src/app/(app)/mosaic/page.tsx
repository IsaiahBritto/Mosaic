import { redirect } from "next/navigation";
import { endOfYear, startOfYear } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { parseDateParam, withDateParam } from "@/lib/calendar/date-params";
import { buildYearMosaicDays } from "@/lib/calendar/mosaic";
import { getExpandedEventsInRange } from "@/lib/queries/events";
import { MosaicGrid } from "@/components/calendar/MosaicGrid";
import { AppHeader } from "@/components/shell/AppHeader";

type MosaicPageProps = {
  searchParams: Promise<{ date?: string }>;
};

export default async function MosaicPage({ searchParams }: MosaicPageProps) {
  const params = await searchParams;
  const selectedDate = parseDateParam(params.date);
  const year = selectedDate.getFullYear();

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
  const yearStart = startOfYear(new Date(year, 0, 1));
  const yearEnd = endOfYear(new Date(year, 0, 1));

  const events = await getExpandedEventsInRange(yearStart, yearEnd);
  const days = buildYearMosaicDays(year, events, timezone);

  return (
    <div className="flex h-dvh flex-col">
      <AppHeader
        title="My Mosaic"
        exitHref={withDateParam("/month", selectedDate)}
        hideAction
      />
      <MosaicGrid days={days} />
    </div>
  );
}
