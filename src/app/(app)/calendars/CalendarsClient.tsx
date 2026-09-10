"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Calendar, CalendarGroup } from "@/types/calendar";
import { EditCalendarDialog } from "@/components/calendar/EditCalendarDialog";
import {
  deleteCalendar,
  saveCalendarPreferences,
  setAllCalendarsVisibilityAction,
} from "@/lib/actions/calendars";
import { AppHeader } from "@/components/shell/AppHeader";
import { CalendarList } from "@/components/calendar/CalendarList";
import { NewCalendarForm } from "@/components/calendar/NewCalendarForm";
import { Checkbox } from "@/components/ui/Checkbox";
import { THEME } from "@/lib/theme/colors";
import { GoogleConnectSection } from "@/components/integrations/GoogleConnectSection";
import { GoogleCalendarPicker } from "@/components/integrations/GoogleCalendarPicker";
import { AppleConnectSection } from "@/components/integrations/AppleConnectSection";
import { AppleCalendarPicker } from "@/components/integrations/AppleCalendarPicker";
import { SyncStatusBar } from "@/components/integrations/SyncStatusBar";
import { ConflictResolutionQueue } from "@/components/integrations/ConflictResolutionQueue";
import { features } from "@/lib/config/features";
import { integrationErrorMessage } from "@/lib/integrations/errors";
import type { CalendarConnection } from "@/lib/integrations/types";
import { useToast } from "@/components/ui/Toast";

type CalendarsClientProps = {
  groups: CalendarGroup[];
  initialVisibleIds: string[];
  allCalendarIds: string[];
  exitHref: string;
  connections?: CalendarConnection[];
  connectError?: string | null;
  connectedProvider?: string | null;
  pickerConnectionId?: string | null;
};

export function CalendarsClient({
  groups,
  initialVisibleIds,
  allCalendarIds,
  exitHref,
  connections = [],
  connectError = null,
  connectedProvider = null,
  pickerConnectionId = null,
}: CalendarsClientProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [visibleIds, setVisibleIds] = useState<string[]>(initialVisibleIds);
  const [isPending, startTransition] = useTransition();
  const [showGooglePicker, setShowGooglePicker] = useState(
    Boolean(pickerConnectionId && connectedProvider === "google"),
  );
  const [showApplePicker, setShowApplePicker] = useState(
    Boolean(pickerConnectionId && connectedProvider === "apple"),
  );
  const [showConflicts, setShowConflicts] = useState(false);
  const [activeGooglePickerId, setActiveGooglePickerId] = useState<
    string | null
  >(connectedProvider === "google" ? pickerConnectionId : null);
  const [activeApplePickerId, setActiveApplePickerId] = useState<
    string | null
  >(connectedProvider === "apple" ? pickerConnectionId : null);
  const [editingCalendar, setEditingCalendar] = useState<Calendar | null>(null);

  useEffect(() => {
    const message = integrationErrorMessage(connectError);
    if (message) {
      showToast(message, "error");
    }
  }, [connectError, showToast]);

  useEffect(() => {
    if (connectedProvider === "google" && pickerConnectionId) {
      setActiveGooglePickerId(pickerConnectionId);
      setShowGooglePicker(true);
    }
    if (connectedProvider === "apple" && pickerConnectionId) {
      setActiveApplePickerId(pickerConnectionId);
      setShowApplePicker(true);
    }
  }, [connectedProvider, pickerConnectionId]);

  const allVisible = useMemo(
    () =>
      allCalendarIds.length > 0 &&
      allCalendarIds.every((id) => visibleIds.includes(id)),
    [allCalendarIds, visibleIds],
  );

  function handleToggle(calendarId: string, visible: boolean) {
    setVisibleIds((current) =>
      visible
        ? [...new Set([...current, calendarId])]
        : current.filter((id) => id !== calendarId),
    );
  }

  function handleShowHideAll(checked: boolean) {
    startTransition(async () => {
      const result = await setAllCalendarsVisibilityAction({ visible: checked });
      if (!result.success) {
        showToast(result.message, "error");
        return;
      }
      setVisibleIds(checked ? allCalendarIds : []);
    });
  }

  function handleSave() {
    startTransition(async () => {
      const result = await saveCalendarPreferences({ visibleIds });
      if (!result.success) {
        showToast(result.message, "error");
        return;
      }
      showToast("Calendars saved");
      router.push(exitHref);
      router.refresh();
    });
  }

  function handleDelete(calendarId: string) {
    if (!window.confirm("Delete this calendar and all its events?")) return;

    startTransition(async () => {
      const result = await deleteCalendar({ id: calendarId });
      if (!result.success) {
        showToast(result.message, "error");
        return;
      }
      setVisibleIds((current) => current.filter((id) => id !== calendarId));
      showToast("Calendar deleted");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader
        title="Calendars"
        exitHref={exitHref}
        saveLabel={isPending ? "Saving…" : "Save"}
        onSave={handleSave}
      />

      <SyncStatusBar
        connections={connections}
        onSyncComplete={() => setShowConflicts(true)}
      />

      <div className="flex items-center gap-2 border-b border-surface px-4 py-3">
        <Checkbox
          checked={allVisible}
          onChange={handleShowHideAll}
          color={THEME.accent}
        />
        <span className="text-xs uppercase tracking-wide text-accent">
          Show/Hide/Select
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-3">
        <CalendarList
          groups={groups}
          visibleIds={visibleIds}
          onToggle={handleToggle}
          onEdit={setEditingCalendar}
          onDelete={handleDelete}
          showDelete
        />
      </div>

      <NewCalendarForm />

      <section className="border-t border-surface px-4 py-6">
        <h3 className="mb-3 text-center text-xs font-bold uppercase tracking-widest text-text-primary">
          Linked Emails
        </h3>
        {features.linkedGoogleCalendars ? (
          <>
            <GoogleConnectSection connections={connections} />
            {showGooglePicker && activeGooglePickerId ? (
              <div className="mt-4">
                <GoogleCalendarPicker
                  connectionId={activeGooglePickerId}
                  onComplete={() => {
                    setShowGooglePicker(false);
                    setActiveGooglePickerId(null);
                  }}
                />
              </div>
            ) : null}
          </>
        ) : null}
        {features.linkedAppleCalendars ? (
          <div className={features.linkedGoogleCalendars ? "mt-4" : ""}>
            <AppleConnectSection
              connections={connections}
              onConnected={(connectionId) => {
                setActiveApplePickerId(connectionId);
                setShowApplePicker(true);
              }}
            />
            {showApplePicker && activeApplePickerId ? (
              <div className="mt-4">
                <AppleCalendarPicker
                  connectionId={activeApplePickerId}
                  onComplete={() => {
                    setShowApplePicker(false);
                    setActiveApplePickerId(null);
                  }}
                />
              </div>
            ) : null}
          </div>
        ) : null}
        {!features.linkedGoogleCalendars && !features.linkedAppleCalendars ? (
          <>
            <input
              type="email"
              disabled
              placeholder="Email@email.com"
              className="mb-3 w-full rounded-lg bg-surface px-3 py-2 text-sm text-text-secondary"
            />
            <button
              type="button"
              disabled
              className="w-full rounded-full bg-surface py-3 text-sm text-accent/50"
            >
              Add New
            </button>
          </>
        ) : null}
      </section>

      {showConflicts ? <ConflictResolutionQueue /> : null}

      {editingCalendar ? (
        <EditCalendarDialog
          calendar={editingCalendar}
          onClose={() => setEditingCalendar(null)}
        />
      ) : null}
    </div>
  );
}
