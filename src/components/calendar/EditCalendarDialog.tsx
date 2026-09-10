"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Calendar } from "@/types/calendar";
import {
  deleteCalendar,
  revertCalendarDisplay,
  updateCalendarDisplay,
} from "@/lib/actions/calendars";
import { leaveCalendar } from "@/lib/actions/sharing";
import { ColorPicker } from "@/components/calendar/ColorPicker";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";

type EditCalendarDialogProps = {
  calendar: Calendar;
  onClose: () => void;
};

type DisplayScope = "global" | "personal";

function canChooseScope(calendar: Calendar): boolean {
  return (
    calendar.source === "native" &&
    calendar.type === "shared" &&
    calendar.role === "editor"
  );
}

function canDelete(calendar: Calendar): boolean {
  return calendar.role === "owner" && calendar.source === "native";
}

function canLeave(calendar: Calendar): boolean {
  return calendar.role !== "owner";
}

export function EditCalendarDialog({
  calendar,
  onClose,
}: EditCalendarDialogProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(calendar.name);
  const [colorHex, setColorHex] = useState(calendar.colorHex);
  const [scope, setScope] = useState<DisplayScope>(
    canChooseScope(calendar) ? "personal" : "global",
  );

  const showScopeChoice = canChooseScope(calendar);
  const isLinked = calendar.source === "google" || calendar.source === "apple";

  function handleSave() {
    if (!name.trim()) {
      showToast("Name is required", "error");
      return;
    }

    startTransition(async () => {
      let effectiveScope: DisplayScope = "global";
      if (showScopeChoice) {
        effectiveScope = scope;
      } else if (calendar.type === "shared" && calendar.role === "viewer") {
        effectiveScope = "personal";
      }

      const result = await updateCalendarDisplay({
        id: calendar.id,
        name: name.trim(),
        colorHex,
        scope: effectiveScope,
      });

      if (!result.success) {
        showToast(result.message, "error");
        return;
      }

      showToast("Calendar updated");
      onClose();
      router.refresh();
    });
  }

  function handleRevert() {
    startTransition(async () => {
      const result = await revertCalendarDisplay({ id: calendar.id });
      if (!result.success) {
        showToast(result.message, "error");
        return;
      }
      showToast("Reverted to shared settings");
      onClose();
      router.refresh();
    });
  }

  function handleDelete() {
    if (!window.confirm(`Delete "${calendar.name}" and all its events?`)) {
      return;
    }

    startTransition(async () => {
      const result = await deleteCalendar({ id: calendar.id });
      if (!result.success) {
        showToast(result.message, "error");
        return;
      }
      showToast("Calendar deleted");
      onClose();
      router.refresh();
    });
  }

  function handleLeave() {
    if (!window.confirm(`Leave "${calendar.canonicalName ?? calendar.name}"?`)) {
      return;
    }

    startTransition(async () => {
      const result = await leaveCalendar({ calendarId: calendar.id });
      if (!result.success) {
        showToast(result.message, "error");
        return;
      }
      showToast("Left shared calendar");
      onClose();
      router.refresh();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div
        className="w-full max-w-md rounded-xl bg-background p-4 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-calendar-title"
      >
        <h2
          id="edit-calendar-title"
          className="mb-4 text-lg font-semibold text-text-primary"
        >
          Edit calendar
        </h2>

        {isLinked ? (
          <p className="mb-3 text-xs text-text-secondary">
            Linked from {calendar.source === "google" ? "Google" : "iCloud"}.
            Name and color apply in Mosaic only.
          </p>
        ) : null}

        <div className="mb-4 flex flex-col gap-3">
          <Input
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <ColorPicker value={colorHex} onChange={setColorHex} />
        </div>

        {showScopeChoice ? (
          <fieldset className="mb-4 space-y-2">
            <legend className="mb-1 text-xs font-bold uppercase tracking-widest text-text-secondary">
              Save for
            </legend>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="radio"
                name="display-scope"
                checked={scope === "global"}
                onChange={() => setScope("global")}
              />
              Everyone on this calendar
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="radio"
                name="display-scope"
                checked={scope === "personal"}
                onChange={() => setScope("personal")}
              />
              Only me
            </label>
          </fieldset>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={handleSave} disabled={isPending}>
            {isPending ? "Saving…" : "Save"}
          </Button>
          <Button size="sm" variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          {calendar.hasPersonalOverride ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleRevert}
              disabled={isPending}
            >
              Revert to owner settings
            </Button>
          ) : null}
          {canDelete(calendar) ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDelete}
              disabled={isPending}
              className="text-status-busy"
            >
              Delete
            </Button>
          ) : null}
          {canLeave(calendar) ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleLeave}
              disabled={isPending}
              className="text-status-busy"
            >
              Leave shared calendar
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
