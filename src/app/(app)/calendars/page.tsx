import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCalendarsPageData } from "@/lib/services/calendar.service";
import { CalendarsClient } from "@/app/(app)/calendars/CalendarsClient";
import { fetchConnectionsForUser } from "@/lib/integrations/sync.service";
import type { CalendarConnection } from "@/lib/integrations/types";
import { withDateParam, parseDateParam } from "@/lib/calendar/date-params";

type CalendarsPageProps = {
  searchParams: Promise<{ date?: string }>;
};

export default async function CalendarsPage({ searchParams }: CalendarsPageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { groups, visibleIds, calendars } = await getCalendarsPageData(
    supabase,
    user.id,
  );

  let connections: CalendarConnection[] = [];
  try {
    connections = await fetchConnectionsForUser(supabase, user.id);
  } catch {
    connections = [];
  }

  const exitHref = withDateParam("/month", parseDateParam(params.date));

  return (
    <CalendarsClient
      groups={groups}
      initialVisibleIds={visibleIds}
      allCalendarIds={calendars.map((c) => c.id)}
      exitHref={exitHref}
      connections={connections}
    />
  );
}
