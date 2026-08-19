"use client";

import { useCallback, useRef, useState } from "react";
import {
  PX_PER_HOUR,
  TIMELINE_TOTAL_HOURS,
} from "@/lib/calendar/constants";
import {
  applyMinutesDeltaToEvent,
  clampTimelineMinutes,
  eventToPosition,
  minutesFromTimelineStart,
  positionFromMinutes,
  SNAP_INTERVAL_MINUTES,
  type EventPosition,
} from "@/lib/calendar/timeline";
import type { EventInstance } from "@/types/event";

export type TimelineDragMode = "move" | "resizeStart" | "resizeEnd";

type UseTimelineDragOptions = {
  event: EventInstance;
  displayTimezone: string;
  timelineRef: React.RefObject<HTMLElement | null>;
};

type DragCompletePayload = {
  startAt: string;
  endAt: string;
  mode: TimelineDragMode;
};

type DragState = {
  mode: TimelineDragMode;
  startY: number;
  initialStartMinutes: number;
  initialEndMinutes: number;
  moved: boolean;
};

export function useTimelineDrag({
  event,
  displayTimezone,
  timelineRef,
}: UseTimelineDragOptions) {
  const [preview, setPreview] = useState<EventPosition | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragState = useRef<DragState | null>(null);
  const didDragRef = useRef(false);

  const basePosition = eventToPosition(event, displayTimezone);

  const computePreview = useCallback(
    (deltaMinutes: number, mode: TimelineDragMode): EventPosition => {
      const { startAt, endAt } = applyMinutesDeltaToEvent(
        event.startAt,
        event.endAt,
        deltaMinutes,
        mode,
      );
      const startMinutes = clampTimelineMinutes(
        minutesFromTimelineStart(startAt, displayTimezone),
      );
      const endMinutes = clampTimelineMinutes(
        minutesFromTimelineStart(endAt, displayTimezone),
      );

      return {
        ...positionFromMinutes(
          startMinutes,
          endMinutes,
          event.travelBeforeMinutes,
          event.travelAfterMinutes,
          displayTimezone,
          startAt,
          endAt,
        ),
      };
    },
    [displayTimezone, event],
  );

  const clampMoveMinutes = useCallback(
    (startMinutes: number, endMinutes: number) => {
      const duration = endMinutes - startMinutes;
      let nextStart = startMinutes;
      let nextEnd = endMinutes;

      if (nextEnd > TIMELINE_TOTAL_HOURS * 60) {
        nextEnd = TIMELINE_TOTAL_HOURS * 60;
        nextStart = nextEnd - duration;
      }
      if (nextStart < 0) {
        nextStart = 0;
        nextEnd = duration;
      }

      return { startMinutes: nextStart, endMinutes: nextEnd };
    },
    [],
  );

  const handlePointerDown = useCallback(
    (pointerEvent: React.PointerEvent, mode: TimelineDragMode) => {
      pointerEvent.preventDefault();
      pointerEvent.stopPropagation();
      pointerEvent.currentTarget.setPointerCapture(pointerEvent.pointerId);

      dragState.current = {
        mode,
        startY: pointerEvent.clientY,
        initialStartMinutes: minutesFromTimelineStart(
          event.startAt,
          displayTimezone,
        ),
        initialEndMinutes: minutesFromTimelineStart(
          event.endAt,
          displayTimezone,
        ),
        moved: false,
      };
      didDragRef.current = false;
      setIsDragging(true);
    },
    [displayTimezone, event.endAt, event.startAt],
  );

  const handlePointerMove = useCallback(
    (pointerEvent: React.PointerEvent) => {
      if (!dragState.current || !timelineRef.current) {
        return;
      }

      const deltaY = pointerEvent.clientY - dragState.current.startY;
      if (Math.abs(deltaY) > 4) {
        dragState.current.moved = true;
        didDragRef.current = true;
      }

      const rawDeltaMinutes =
        Math.round(((deltaY / PX_PER_HOUR) * 60) / SNAP_INTERVAL_MINUTES) *
        SNAP_INTERVAL_MINUTES;
      const { mode, initialStartMinutes, initialEndMinutes } = dragState.current;

      if (mode === "move") {
        let nextStart = clampTimelineMinutes(
          initialStartMinutes + rawDeltaMinutes,
        );
        let nextEnd = clampTimelineMinutes(initialEndMinutes + rawDeltaMinutes);
        ({ startMinutes: nextStart, endMinutes: nextEnd } = clampMoveMinutes(
          nextStart,
          nextEnd,
        ));

        const { startAt, endAt } = applyMinutesDeltaToEvent(
          event.startAt,
          event.endAt,
          nextStart - initialStartMinutes,
          "move",
        );

        setPreview({
          ...positionFromMinutes(
            nextStart,
            nextEnd,
            event.travelBeforeMinutes,
            event.travelAfterMinutes,
            displayTimezone,
            startAt,
            endAt,
          ),
        });
        return;
      }

      setPreview(computePreview(rawDeltaMinutes, mode));
    },
    [clampMoveMinutes, computePreview, displayTimezone, event, timelineRef],
  );

  const handlePointerUp = useCallback(
    (pointerEvent: React.PointerEvent): DragCompletePayload | null => {
      if (!dragState.current) {
        return null;
      }

      pointerEvent.currentTarget.releasePointerCapture(pointerEvent.pointerId);
      const state = dragState.current;
      dragState.current = null;
      setIsDragging(false);

      if (!state.moved) {
        setPreview(null);
        return null;
      }

      const deltaY = pointerEvent.clientY - state.startY;
      const deltaMinutes =
        Math.round(((deltaY / PX_PER_HOUR) * 60) / SNAP_INTERVAL_MINUTES) *
        SNAP_INTERVAL_MINUTES;

      if (state.mode === "move") {
        let nextStart = clampTimelineMinutes(state.initialStartMinutes + deltaMinutes);
        let nextEnd = clampTimelineMinutes(state.initialEndMinutes + deltaMinutes);
        ({ startMinutes: nextStart, endMinutes: nextEnd } = clampMoveMinutes(
          nextStart,
          nextEnd,
        ));
        const moveDelta = nextStart - state.initialStartMinutes;
        const times = applyMinutesDeltaToEvent(
          event.startAt,
          event.endAt,
          moveDelta,
          "move",
        );
        setPreview(null);
        return { ...times, mode: state.mode };
      }

      const times = applyMinutesDeltaToEvent(
        event.startAt,
        event.endAt,
        deltaMinutes,
        state.mode,
      );
      setPreview(null);
      return { ...times, mode: state.mode };
    },
    [clampMoveMinutes, event.endAt, event.startAt],
  );

  return {
    basePosition,
    preview,
    isDragging,
    didDragRef,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  };
}
