"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { GoogleCalendarListItem } from "@/lib/integrations/sync-types";
import {
  getAccountHeaderState,
  normalizeGoogleCalendarLabel,
} from "@/lib/integrations/google/calendar-display";
import { LinkedAccountCalendarGroup } from "@/components/calendar/LinkedAccountCalendarGroup";
import { Checkbox } from "@/components/ui/Checkbox";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { THEME } from "@/lib/theme/colors";

type GoogleCalendarPickerProps = {
  connectionId: string;
  onComplete?: () => void;
};

export function GoogleCalendarPicker({
  connectionId,
  onComplete,
}: GoogleCalendarPickerProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [accountEmail, setAccountEmail] = useState("");
  const [calendars, setCalendars] = useState<GoogleCalendarListItem[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(
          `/api/integrations/google/calendars?connectionId=${encodeURIComponent(connectionId)}`,
        );
        const data = (await response.json()) as {
          accountEmail?: string;
          calendars?: GoogleCalendarListItem[];
          error?: string;
        };

        if (!response.ok) {
          throw new Error(data.error ?? "Failed to load calendars");
        }

        if (!cancelled) {
          const items = data.calendars ?? [];
          setAccountEmail(data.accountEmail ?? "");
          setCalendars(items);
          const defaults = items
            .filter((c) => c.primary || c.selected)
            .map((c) => c.id);
          setSelected(defaults.length > 0 ? defaults : items.slice(0, 1).map((c) => c.id));
        }
      } catch (error) {
        if (!cancelled) {
          showToast(
            error instanceof Error ? error.message : "Failed to load calendars",
            "error",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [connectionId, showToast]);

  const childIds = calendars.map((c) => c.id);
  const { allSelected } = getAccountHeaderState(selected, childIds);

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
    );
  }

  function toggleAll(selectAll: boolean) {
    setSelected(selectAll ? childIds : []);
  }

  function handleSave() {
    if (selected.length === 0) {
      showToast("Select at least one calendar", "error");
      return;
    }

    startTransition(async () => {
      const response = await fetch("/api/integrations/google/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId, selectedCalendarIds: selected }),
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        showToast(data.error ?? "Failed to save calendars", "error");
        return;
      }

      showToast("Google calendars imported");
      onComplete?.();
      router.refresh();
    });
  }

  if (loading) {
    return (
      <p className="py-4 text-sm text-text-secondary">Loading Google calendars…</p>
    );
  }

  return (
    <div className="rounded-lg border border-surface bg-surface/40 p-4">
      <h4 className="mb-3 text-xs font-bold uppercase tracking-widest text-text-secondary">
        Select calendars to import
      </h4>
      <div className="mb-4 max-h-48 overflow-y-auto">
        <LinkedAccountCalendarGroup
          accountEmail={accountEmail || "Google account"}
          connectionId={connectionId}
          headerChecked={allSelected}
          onHeaderToggle={toggleAll}
        >
          {calendars.map((calendar) => (
            <label
              key={calendar.id}
              className="flex cursor-pointer items-center gap-3 py-1.5 text-sm text-text-primary"
            >
              <Checkbox
                checked={selected.includes(calendar.id)}
                onChange={() => toggle(calendar.id)}
                color={calendar.backgroundColor ?? THEME.accent}
              />
              <span className="flex-1">
                {normalizeGoogleCalendarLabel(calendar, accountEmail)}
              </span>
              {calendar.primary ? (
                <span className="text-[10px] uppercase text-text-secondary">
                  Primary
                </span>
              ) : null}
              {calendar.accessRole === "reader" ||
              calendar.accessRole === "freeBusyReader" ? (
                <span className="text-[10px] uppercase text-text-secondary">
                  Read-only
                </span>
              ) : null}
            </label>
          ))}
        </LinkedAccountCalendarGroup>
      </div>
      <Button size="sm" onClick={handleSave} disabled={isPending}>
        {isPending ? "Importing…" : "Import selected calendars"}
      </Button>
    </div>
  );
}
