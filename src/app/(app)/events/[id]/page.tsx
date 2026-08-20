import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseDateParam, withDateParam } from "@/lib/calendar/date-params";
import {
  eventToFormDefaults,
  getEventForUser,
  getExitDateFromEvent,
  getWritableCalendarOptions,
} from "@/lib/services/event.service";
import { sanitizeReturnTo } from "@/lib/navigation/return-to";
import { EventForm } from "@/components/events/EventForm";

type EditEventPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ date?: string; returnTo?: string }>;
};

export default async function EditEventPage({
  params,
  searchParams,
}: EditEventPageProps) {
  const { id } = await params;
  const query = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  let event;
  try {
    event = await getEventForUser(supabase, user.id, id);
  } catch {
    notFound();
  }

  const calendars = await getWritableCalendarOptions(supabase, user.id);
  if (calendars.length === 0) {
    redirect("/calendars");
  }

  const fallbackDate = query.date
    ? parseDateParam(query.date)
    : getExitDateFromEvent(event);
  const exitHref =
    sanitizeReturnTo(query.returnTo) ?? withDateParam("/week", fallbackDate);

  return (
    <EventForm
      mode="edit"
      eventId={id}
      defaultValues={eventToFormDefaults(event)}
      calendars={calendars}
      exitHref={exitHref}
      headerTitle="Edit Event"
    />
  );
}
