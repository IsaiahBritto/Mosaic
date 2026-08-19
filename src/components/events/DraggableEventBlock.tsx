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
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils/cn";

type DraggableEventBlockProps = {
  event: EventInstance;
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
  return event.instanceId !== event.masterEventId;
}

export function DraggableEventBlock({
  event,
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
    timelineRef,
  });

  const position: EventPosition =
    preview ?? eventToPosition(event, displayTimezone);

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

  const blockBody = (
    <>
      {position.travelBeforeHeight > 0 ? (
        <div
          className="absolute inset-x-0 top-0 bg-travel-time/40"
          style={{ height: position.travelBeforeHeight }}
        />
      ) : null}
      <div className="relative flex h-full flex-col justify-between text-background">
        <div className="flex items-start justify-between gap-2">
          <span className="truncate font-semibold uppercase">{event.title}</span>
          <span className="shrink-0 opacity-90">{position.startLabel}</span>
        </div>
        {event.location ? (
          <span className="truncate italic opacity-90">{event.location}</span>
        ) : (
          <span />
        )}
        <div className="flex items-end justify-between gap-2">
          <span />
          <span className="shrink-0 text-[10px] uppercase opacity-90">
            End {position.endLabel}
          </span>
        </div>
      </div>
      {position.travelAfterHeight > 0 ? (
        <div
          className="absolute inset-x-0 bottom-0 bg-travel-time/40"
          style={{ height: position.travelAfterHeight }}
        />
      ) : null}
    </>
  );

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
          className="absolute inset-x-0 top-0 z-10 h-2 cursor-ns-resize"
          style={{ top: position.travelBeforeHeight }}
          onPointerDown={(pointerEvent) => {
            onDragActiveChange?.(true);
            handlePointerDown(pointerEvent, "resizeStart");
          }}
        />

        <div
          className="relative h-full px-2 py-1"
          onPointerDown={(pointerEvent) => {
            onDragActiveChange?.(true);
            handlePointerDown(pointerEvent, "move");
          }}
        >
          {blockBody}
        </div>

        <div
          className="absolute inset-x-0 bottom-0 z-10 h-2 cursor-ns-resize"
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
