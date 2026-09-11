import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCalendarsPageData } from "@/lib/services/calendar.service";
import { CalendarsClient } from "@/app/(app)/calendars/CalendarsClient";
import { withDateParam, parseDateParam } from "@/lib/calendar/date-params";

type CalendarsPageProps = {
  searchParams: Promise<{
    date?: string;
    error?: string;
    connected?: string;
    reconnected?: string;
    connectionId?: string;
  }>;
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

  const { sidebarItems, sidebarOrder, visibleIds, calendars, connections } =
    await getCalendarsPageData(supabase, user.id);

  const exitHref = withDateParam("/month", parseDateParam(params.date));

  return (
    <CalendarsClient
      sidebarItems={sidebarItems}
      sidebarOrder={sidebarOrder}
      initialVisibleIds={visibleIds}
      allCalendarIds={calendars.map((c) => c.id)}
      exitHref={exitHref}
      connections={connections}
      connectError={params.error ?? null}
      connectedProvider={params.connected ?? null}
      reconnectedProvider={params.reconnected ?? null}
      pickerConnectionId={params.connectionId ?? null}
    />
  );
}
