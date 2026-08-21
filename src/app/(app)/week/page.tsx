import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCalendarsPageData } from "@/lib/services/calendar.service";
import { getWritableCalendarOptions } from "@/lib/services/event.service";
import { getExpandedEventsInRange } from "@/lib/queries/events";
import {
  getCalendarDayUtcRange,
  resolveCalendarDateParam,
} from "@/lib/calendar/timezone";
import { DayAgenda } from "@/components/calendar/DayAgenda";
import { DayTimeline } from "@/components/calendar/DayTimeline";
import { MonthCalendarSection } from "@/components/calendar/MonthCalendarSection";
import { WeekStrip } from "@/components/shell/WeekStrip";
import { WeekViewShell } from "@/components/shell/WeekViewShell";

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

  const [{ groups, visibleIds }, { data: prefs }] = await Promise.all([
    getCalendarsPageData(supabase, user.id),
    supabase
      .from("user_preferences")
      .select("default_timezone, day_view_mode")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

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

  const timeline =
    viewMode === "agenda" ? (
      <DayAgenda date={selectedDate} events={events} timezone={timezone} />
    ) : (
      <DayTimeline
        date={selectedDate}
        events={events}
        displayTimezone={timezone}
        writableCalendarIds={writableCalendarIds}
      />
    );

  return (
    <WeekViewShell
      dateParam={dateParam}
      displayTimezone={timezone}
      calendar={
        <WeekStrip
          dateParam={dateParam}
          selectedDate={selectedDate}
          displayTimezone={timezone}
        />
      }
      calendars={
        <MonthCalendarSection
          groups={groups}
          visibleIds={visibleIds}
          selectedDate={selectedDate}
          showEmptyHint={visibleIds.length === 0}
          variant="week"
          defaultViewMode={savedMode}
          displayTimezone={timezone}
        />
      }
      events={timeline}
    />
  );
}
