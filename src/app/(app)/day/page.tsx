import { redirect } from "next/navigation";
import { endOfDay, startOfDay } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { parseDateParam } from "@/lib/calendar/date-params";
import { getExpandedEventsInRange } from "@/lib/queries/events";
import { DayAgenda } from "@/components/calendar/DayAgenda";
import { DayTimeline } from "@/components/calendar/DayTimeline";

type DayPageProps = {
  searchParams: Promise<{ date?: string; view?: string }>;
};

export default async function DayPage({ searchParams }: DayPageProps) {
  const params = await searchParams;
  const selectedDate = parseDateParam(params.date);

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
  const savedMode = prefs?.day_view_mode === "agenda" ? "agenda" : "timeline";
  const viewMode =
    params.view === "agenda" || params.view === "timeline"
      ? params.view
      : savedMode;

  const dayStart = startOfDay(selectedDate);
  const dayEnd = endOfDay(selectedDate);
  const events = await getExpandedEventsInRange(dayStart, dayEnd);

  return viewMode === "agenda" ? (
    <DayAgenda date={selectedDate} events={events} timezone={timezone} />
  ) : (
    <DayTimeline date={selectedDate} events={events} timezone={timezone} />
  );
}
