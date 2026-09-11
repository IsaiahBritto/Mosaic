"use client";

import { useEffect, useRef, useState } from "react";
import type { WritableCalendarOption } from "@/types/event";
import { ColorBar } from "@/components/ui/ColorBar";
import { SharedBadge } from "@/components/calendar/SharedBadge";
import { SharedCalendarPanel } from "@/components/calendar/SharedCalendarPanel";
import { isSharedCalendar } from "@/lib/calendar/shared";
import { cn } from "@/lib/utils/cn";

type CalendarSelectProps = {
  calendars: WritableCalendarOption[];
  value: string;
  onChange: (calendarId: string) => void;
  error?: string;
  className?: string;
};

function isWritableCalendarShared(c: WritableCalendarOption): boolean {
  return (
    c.type != null &&
    c.role != null &&
    isSharedCalendar({ type: c.type, role: c.role })
  );
}

export function CalendarSelect({
  calendars,
  value,
  onChange,
  error,
  className,
}: CalendarSelectProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [sharedCalendarId, setSharedCalendarId] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const selected = calendars.find((c) => c.id === value);
  const selectedIndex = calendars.findIndex((c) => c.id === value);
  const selectedIsShared = selected != null && isWritableCalendarShared(selected);

  useEffect(() => {
    if (open) {
      setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
    }
  }, [open, selectedIndex]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  function selectCalendar(calendarId: string) {
    onChange(calendarId);
    setOpen(false);
  }

  function handleTriggerKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      setActiveIndex((current) => {
        if (event.key === "ArrowDown") {
          return Math.min(current + 1, calendars.length - 1);
        }
        return Math.max(current - 1, 0);
      });
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (open && calendars[activeIndex]) {
        selectCalendar(calendars[activeIndex].id);
      } else {
        setOpen(true);
      }
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
    }
  }

  function handleListKeyDown(event: React.KeyboardEvent<HTMLUListElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => Math.min(current + 1, calendars.length - 1));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, 0));
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      if (calendars[activeIndex]) {
        selectCalendar(calendars[activeIndex].id);
      }
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
    }
  }

  return (
    <>
      <div
        className={cn(
          "flex items-stretch gap-3 rounded-lg bg-surface/60 px-3 py-3",
          className,
        )}
      >
        <div ref={containerRef} className="relative flex min-w-0 flex-1 flex-col gap-1.5">
          <label
            htmlFor="calendar"
            className="text-xs uppercase tracking-wide text-text-secondary"
          >
            Calendar
          </label>

          <button
            id="calendar"
            type="button"
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-controls="calendar-listbox"
            onClick={() => setOpen((current) => !current)}
            onKeyDown={handleTriggerKeyDown}
            className={cn(
              "flex w-full items-center gap-2 rounded-lg bg-background px-3 py-2.5 text-left text-sm uppercase tracking-wide text-text-primary",
              "outline-none ring-1 ring-transparent focus:ring-accent/50",
              error && "ring-status-busy/50",
            )}
          >
            <span className="min-w-0 flex-1 truncate">
              {selected?.name ?? "Select calendar"}
            </span>
            {selectedIsShared && selected ? (
              <SharedBadge onClick={() => setSharedCalendarId(selected.id)} />
            ) : null}
            <span aria-hidden className="shrink-0 text-xs text-text-secondary">
              {open ? "▴" : "▾"}
            </span>
          </button>

          {open ? (
            <ul
              id="calendar-listbox"
              role="listbox"
              aria-label="Calendars"
              tabIndex={-1}
              onKeyDown={handleListKeyDown}
              className="absolute left-0 right-0 top-full z-20 mt-1 max-h-60 overflow-y-auto rounded-lg border border-surface bg-background py-1 shadow-lg"
            >
              {calendars.map((calendar, index) => {
                const isSelected = calendar.id === value;
                const isActive = index === activeIndex;
                const shared = isWritableCalendarShared(calendar);

                return (
                  <li
                    key={calendar.id}
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => selectCalendar(calendar.id)}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 px-3 py-2.5 text-sm uppercase tracking-wide text-text-primary",
                      isActive ? "bg-surface/60" : "hover:bg-surface/40",
                    )}
                  >
                    <span
                      aria-hidden
                      className="w-4 shrink-0 text-center text-xs text-text-primary"
                    >
                      {isSelected ? "✓" : ""}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{calendar.name}</span>
                    {shared ? (
                      <SharedBadge
                        onClick={() => setSharedCalendarId(calendar.id)}
                      />
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : null}

          {error ? <p className="text-xs text-status-busy">{error}</p> : null}
        </div>
        <ColorBar
          color={selected?.colorHex ?? "#9379E0"}
          className="w-2 rounded-sm"
        />
      </div>

      <SharedCalendarPanel
        calendarId={sharedCalendarId}
        calendarName={calendars.find((c) => c.id === sharedCalendarId)?.name}
        onClose={() => setSharedCalendarId(null)}
      />
    </>
  );
}
