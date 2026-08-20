"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
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
  timelineRef: React.RefObject<HTMLElement | null>;
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
  timelineRef,
  onDragActiveChange,
}: DraggableEventBlockProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [scopeDialogOpen, setScopeDialogOpen] = useState(false);
  const [pendingReschedule, setPendingReschedule] =
    useState<PendingReschedule | null>(null);
  const lastClickTime = useRef(0);

  const {
    preview,
    isDragging,
    didDragRef,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  } = useTimelineDrag({
    event,
    displayTimezone,
    dateParam,
    timelineRef,
  });

  const position: EventPosition =
    preview ?? eventToPosition(event, displayTimezone, dateParam);

  function submitReschedule(payload: PendingReschedule, scope: "single" | "series") {
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

      router.refresh();
    });
  }

  function handleDragComplete(payload: PendingReschedule | null) {
    onDragActiveChange?.(false);
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

  function handleDoubleClick() {
    if (didDragRef.current) {
      return;
    }
    router.push(editHref);
  }

  function handleClick() {
    const now = Date.now();
    if (now - lastClickTime.current < 350) {
      handleDoubleClick();
    }
    lastClickTime.current = now;
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
        onDoubleClick={handleDoubleClick}
      >
        {blockBody}
      </div>
    );
  }

  return (
    <>
      <div
        className={cn(
          "absolute left-14 right-2 overflow-hidden rounded-lg text-xs shadow-md",
          isDragging || isPending ? "opacity-90 ring-2 ring-accent/60" : "",
          "cursor-grab active:cursor-grabbing",
        )}
        style={{
          top: position.top,
          height: position.height,
          backgroundColor: event.calendarColor,
        }}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onPointerMove={handlePointerMove}
        onPointerUp={(pointerEvent) => {
          const payload = handlePointerUp(pointerEvent);
          handleDragComplete(payload);
        }}
      >
        <div
          className="absolute inset-x-0 top-0 z-10 h-3 cursor-ns-resize"
          style={{ top: position.travelBeforeHeight }}
          onPointerDown={(pointerEvent) => {
            onDragActiveChange?.(true);
            handlePointerDown(pointerEvent, "resizeStart");
          }}
        />

        <div
          className="relative h-full"
          onPointerDown={(pointerEvent) => {
            onDragActiveChange?.(true);
            handlePointerDown(pointerEvent, "move");
          }}
        >
          {blockBody}
        </div>

        <div
          className="absolute inset-x-0 bottom-0 z-10 h-3 cursor-ns-resize"
          style={{ bottom: position.travelAfterHeight }}
          onPointerDown={(pointerEvent) => {
            onDragActiveChange?.(true);
            handlePointerDown(pointerEvent, "resizeEnd");
          }}
        />
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
