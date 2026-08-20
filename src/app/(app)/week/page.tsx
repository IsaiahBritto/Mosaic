import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWritableCalendarOptions } from "@/lib/services/event.service";
import { getExpandedEventsInRange } from "@/lib/queries/events";
import {
  getCalendarDayUtcRange,
  resolveCalendarDateParam,
} from "@/lib/calendar/timezone";
import { DayAgenda } from "@/components/calendar/DayAgenda";
import { DayTimeline } from "@/components/calendar/DayTimeline";

type WeekPageProps = {
  searchParams: Promise<{ date?: string; view?: string }>;
};

export default async function WeekPage({ searchParams }: WeekPageProps) {
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
    .select("default_timezone, day_view_mode")
    .eq("user_id", user.id)
    .maybeSingle();

  const timezone = prefs?.default_timezone ?? "America/New_York";
  const { dateParam, selectedDate } = resolveCalendarDateParam(params.date, timezone);
  const savedMode = prefs?.day_view_mode === "agenda" ? "agenda" : "timeline";
  const viewMode =
    params.view === "agenda" || params.view === "timeline"
      ? params.view
      : savedMode;

  const { start: dayStart, end: dayEnd } = getCalendarDayUtcRange(dateParam, timezone);
  const events = await getExpandedEventsInRange(dayStart, dayEnd);
  const writableCalendars = await getWritableCalendarOptions(supabase, user.id);
  const writableCalendarIds = writableCalendars.map((calendar) => calendar.id);

  return viewMode === "agenda" ? (
    <DayAgenda date={selectedDate} events={events} timezone={timezone} />
  ) : (
    <DayTimeline
      date={selectedDate}
      events={events}
      displayTimezone={timezone}
      writableCalendarIds={writableCalendarIds}
    />
  );
}
