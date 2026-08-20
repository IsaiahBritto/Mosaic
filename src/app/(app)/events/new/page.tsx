import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseDateParam, withDateParam, formatDateParam } from "@/lib/calendar/date-params";
import {
  buildDefaultEventFormValues,
  getWritableCalendarOptions,
} from "@/lib/services/event.service";
import { sanitizeReturnTo } from "@/lib/navigation/return-to";
import { EventForm } from "@/components/events/EventForm";

type NewEventPageProps = {
  searchParams: Promise<{
    date?: string;
    calendarId?: string;
    startTime?: string;
    returnTo?: string;
  }>;
};

export default async function NewEventPage({ searchParams }: NewEventPageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const calendars = await getWritableCalendarOptions(supabase, user.id);
  if (calendars.length === 0) {
    redirect("/calendars");
  }

  const selectedDate = parseDateParam(params.date);
  const defaultDate = formatDateParam(selectedDate);
  const calendarId =
    params.calendarId && calendars.some((c) => c.id === params.calendarId)
      ? params.calendarId
      : calendars[0]!.id;

  const { data: prefs } = await supabase
    .from("user_preferences")
    .select("default_timezone")
    .eq("user_id", user.id)
    .maybeSingle();

  const defaultValues = buildDefaultEventFormValues({
    defaultDate,
    calendarId,
    timezone: prefs?.default_timezone ?? "America/New_York",
    startTime: params.startTime,
  });

  const exitHref =
    sanitizeReturnTo(params.returnTo) ?? withDateParam("/week", selectedDate);

  return (
    <EventForm
      mode="create"
      defaultValues={defaultValues}
      calendars={calendars}
      exitHref={exitHref}
      headerTitle="New Event"
    />
  );
}
