"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { rescheduleEvent } from "@/lib/actions/events";
import {
  eventToPosition,
  type EventPosition,
} from "@/lib/calendar/timeline";
import {
  useTimelineDrag,
  type TimelineDragMode,
} from "@/hooks/useTimelineDrag";
import type { EventInstance } from "@/types/event";
import { RecurrenceScopeDialog } from "@/components/events/RecurrenceScopeDialog";
import {
  EventCardContent,
  TravelZone,
} from "@/components/events/EventCardContent";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils/cn";

type DraggableEventBlockProps = {
  event: EventInstance;
  dateParam: string;
  displayTimezone: string;
  editHref: string;
  canEdit: boolean;
  isSelected: boolean;
  timelineRef: React.RefObject<HTMLElement | null>;
  onSelect: () => void;
  onDeselect: () => void;
  onDragActiveChange?: (active: boolean) => void;
};

type PendingReschedule = {
  startAt: string;
  endAt: string;
  mode: TimelineDragMode;
};

function isRecurringInstance(event: EventInstance): boolean {
  return Boolean(event.recurrence) || event.instanceId !== event.masterEventId;
}

function ResizeHandle({
  edge,
  style,
  onPointerDown,
}: {
  edge: "top" | "bottom";
  style?: React.CSSProperties;
  onPointerDown: (event: React.PointerEvent) => void;
}) {
  return (
    <div
      className={cn(
        "absolute inset-x-0 z-10 flex h-8 cursor-ns-resize items-center justify-center",
        edge === "top" ? "top-0" : "bottom-0",
      )}
      style={{ ...style, touchAction: "none" }}
      onPointerDown={onPointerDown}
    >
      <div className="h-1 w-8 rounded-full bg-background/70" />
    </div>
  );
}

function TimelineBlockBody({
  event,
  position,
}: {
  event: EventInstance;
  position: EventPosition;
}) {
  const eventBodyTop = position.travelBeforeHeight;
  const eventBodyHeight = Math.max(
    position.height - position.travelBeforeHeight - position.travelAfterHeight,
    0,
  );

  return (
    <>
      {position.travelBeforeHeight > 0 ? (
        <TravelZone
          calendarColor={event.calendarColor}
          className="absolute inset-x-0 top-0"
          style={{ height: position.travelBeforeHeight }}
        />
      ) : null}

      <div
        className="absolute inset-x-0 overflow-hidden px-2 py-1"
        style={{ top: eventBodyTop, height: eventBodyHeight }}
      >
        <EventCardContent
          title={event.title}
          location={event.location}
          startTime={position.startLabel}
          endTime={position.endLabel}
          isRecurring={isRecurringInstance(event)}
          textOnColor
        />
      </div>

      {position.travelAfterHeight > 0 ? (
        <TravelZone
          calendarColor={event.calendarColor}
          label="Travel after"
          className="absolute inset-x-0 bottom-0"
          style={{ height: position.travelAfterHeight }}
        />
      ) : null}
    </>
  );
}

export function DraggableEventBlock({
  event,
  dateParam,
  displayTimezone,
  editHref,
  canEdit,
  isSelected,
  timelineRef,
  onSelect,
  onDeselect,
  onDragActiveChange,
}: DraggableEventBlockProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [scopeDialogOpen, setScopeDialogOpen] = useState(false);
  const [pendingReschedule, setPendingReschedule] =
    useState<PendingReschedule | null>(null);
  const lastTapTime = useRef(0);
  const wasSelectedOnPointerDown = useRef(false);
  const suppressClickRef = useRef(false);
  const pendingDeselectTimeout = useRef<number | null>(null);

  const {
    preview,
    isDragging,
    didDragRef,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
    handleLostPointerCapture,
  } = useTimelineDrag({
    event,
    displayTimezone,
    dateParam,
    timelineRef,
    isSelected,
    onSelect,
  });

  useEffect(() => {
    onDragActiveChange?.(isDragging);
  }, [isDragging, onDragActiveChange]);

  useEffect(() => {
    return () => clearPendingDeselect();
  }, []);

  const position: EventPosition =
    preview ?? eventToPosition(event, displayTimezone, dateParam);

  function submitReschedule(
    payload: PendingReschedule,
    scope: "single" | "series",
  ) {
    startTransition(async () => {
      const result = await rescheduleEvent({
        eventId: event.masterEventId,
        originalStartAt: event.originalOccurrenceStartAt ?? event.startAt,
        originalEndAt: event.endAt,
        startAt: payload.startAt,
        endAt: payload.endAt,
        scope,
        mode: payload.mode,
      });

      if (!result.success) {
        showToast(result.message, "error");
        return;
      }

      onDeselect();
      router.refresh();
    });
  }

  function clearPendingDeselect() {
    if (pendingDeselectTimeout.current !== null) {
      window.clearTimeout(pendingDeselectTimeout.current);
      pendingDeselectTimeout.current = null;
    }
  }

  function handleDragComplete(payload: PendingReschedule | null) {
    if (!payload) {
      return;
    }

    if (isRecurringInstance(event)) {
      setPendingReschedule(payload);
      setScopeDialogOpen(true);
      return;
    }

    submitReschedule(payload, "single");
  }

  function handlePointerUpComplete(pointerEvent: React.PointerEvent) {
    const result = handlePointerUp(pointerEvent);

    if (result.payload) {
      clearPendingDeselect();
      handleDragComplete(result.payload);
      return;
    }

    if (!result.tapped || result.mode !== "move") {
      return;
    }

    if (!wasSelectedOnPointerDown.current) {
      suppressClickRef.current = true;
      lastTapTime.current = Date.now();
      return;
    }

    const now = Date.now();
    if (now - lastTapTime.current < 350) {
      clearPendingDeselect();
      router.push(editHref);
      lastTapTime.current = 0;
      return;
    }

    lastTapTime.current = now;
    clearPendingDeselect();
    pendingDeselectTimeout.current = window.setTimeout(() => {
      pendingDeselectTimeout.current = null;
      onDeselect();
    }, 350);
  }

  function handleClick() {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
    }
  }

  const blockBody = <TimelineBlockBody event={event} position={position} />;

  if (!canEdit) {
    return (
      <div
        className="absolute left-14 right-2 overflow-hidden rounded-lg px-2 py-1 text-xs shadow-md"
        style={{
          top: position.top,
          height: position.height,
          backgroundColor: event.calendarColor,
        }}
        onClick={() => router.push(editHref)}
      >
        {blockBody}
      </div>
    );
  }

  return (
    <>
      <div
        className={cn(
          "absolute left-14 right-2 overflow-hidden rounded-lg text-xs shadow-md transition-shadow",
          isSelected && "z-10 scale-[1.02] shadow-lg ring-2 ring-accent",
          isDragging || isPending ? "opacity-90" : "",
          isSelected ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
        )}
        style={{
          top: position.top,
          height: position.height,
          backgroundColor: event.calendarColor,
          touchAction: isSelected ? "none" : "auto",
        }}
        onClick={handleClick}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUpComplete}
        onPointerCancel={handlePointerCancel}
        onLostPointerCapture={handleLostPointerCapture}
      >
        {isSelected ? (
          <ResizeHandle
            edge="top"
            style={{ top: position.travelBeforeHeight }}
            onPointerDown={(pointerEvent) => {
              handlePointerDown(pointerEvent, "resizeStart");
            }}
          />
        ) : null}

        <div
          className="relative h-full"
          onPointerDown={(pointerEvent) => {
            wasSelectedOnPointerDown.current = isSelected;
            handlePointerDown(pointerEvent, "move");
          }}
          onPointerMove={handlePointerMove}
        >
          {blockBody}
        </div>

        {isSelected ? (
          <ResizeHandle
            edge="bottom"
            style={{ bottom: position.travelAfterHeight }}
            onPointerDown={(pointerEvent) => {
              handlePointerDown(pointerEvent, "resizeEnd");
            }}
          />
        ) : null}
      </div>

      <RecurrenceScopeDialog
        open={scopeDialogOpen}
        onSelect={(scope) => {
          setScopeDialogOpen(false);
          if (pendingReschedule) {
            submitReschedule(pendingReschedule, scope);
          }
          setPendingReschedule(null);
        }}
        onCancel={() => {
          setScopeDialogOpen(false);
          setPendingReschedule(null);
          router.refresh();
        }}
      />
    </>
  );
}
