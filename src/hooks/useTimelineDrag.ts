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

const TAP_THRESHOLD_PX = 8;
const EDGE_SCROLL_ZONE_PX = 72;
const EDGE_SCROLL_SPEED_PX = 10;

type UseTimelineDragOptions = {
  event: EventInstance;
  displayTimezone: string;
  dateParam: string;
  timelineRef: React.RefObject<HTMLElement | null>;
  isSelected: boolean;
  onSelect?: () => void;
};

export type DragCompletePayload = {
  startAt: string;
  endAt: string;
  mode: TimelineDragMode;
};

export type PointerUpResult = {
  payload: DragCompletePayload | null;
  tapped: boolean;
  mode: TimelineDragMode | null;
};

type DragState = {
  mode: TimelineDragMode;
  startY: number;
  startScrollTop: number;
  initialStartMinutes: number;
  initialEndMinutes: number;
  moved: boolean;
  pointerId: number;
  captureTarget: Element;
};

type TapState = {
  startY: number;
  pointerId: number;
};

function applyEdgeScroll(clientY: number, main: HTMLElement): void {
  const rect = main.getBoundingClientRect();

  if (clientY < rect.top + EDGE_SCROLL_ZONE_PX) {
    main.scrollTop -= EDGE_SCROLL_SPEED_PX;
  } else if (clientY > rect.bottom - EDGE_SCROLL_ZONE_PX) {
    main.scrollTop += EDGE_SCROLL_SPEED_PX;
  }
}

export function useTimelineDrag({
  event,
  displayTimezone,
  dateParam,
  timelineRef,
  isSelected,
  onSelect,
}: UseTimelineDragOptions) {
  const [preview, setPreview] = useState<EventPosition | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragState = useRef<DragState | null>(null);
  const tapState = useRef<TapState | null>(null);
  const didDragRef = useRef(false);

  const basePosition = eventToPosition(event, displayTimezone, dateParam);

  const getMainElement = useCallback(() => {
    return timelineRef.current?.closest("main") ?? null;
  }, [timelineRef]);

  const getMainScrollTop = useCallback(() => {
    return getMainElement()?.scrollTop ?? 0;
  }, [getMainElement]);

  const resetDrag = useCallback(() => {
    dragState.current = null;
    setPreview(null);
    setIsDragging(false);
  }, []);

  const computeEffectiveDeltaY = useCallback(
    (clientY: number, state: DragState) => {
      return (
        clientY -
        state.startY +
        (getMainScrollTop() - state.startScrollTop)
      );
    },
    [getMainScrollTop],
  );

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

  const updatePreview = useCallback(
    (deltaY: number, state: DragState) => {
      const rawDeltaMinutes =
        Math.round(((deltaY / PX_PER_HOUR) * 60) / SNAP_INTERVAL_MINUTES) *
        SNAP_INTERVAL_MINUTES;
      const { mode, initialStartMinutes, initialEndMinutes } = state;

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
    [clampMoveMinutes, computePreview, displayTimezone, event],
  );

  const startDrag = useCallback(
    (pointerEvent: React.PointerEvent, mode: TimelineDragMode) => {
      pointerEvent.preventDefault();
      pointerEvent.stopPropagation();
      pointerEvent.currentTarget.setPointerCapture(pointerEvent.pointerId);

      dragState.current = {
        mode,
        startY: pointerEvent.clientY,
        startScrollTop: getMainScrollTop(),
        initialStartMinutes: minutesFromTimelineStart(
          event.startAt,
          displayTimezone,
        ),
        initialEndMinutes: minutesFromTimelineStart(
          event.endAt,
          displayTimezone,
        ),
        moved: false,
        pointerId: pointerEvent.pointerId,
        captureTarget: pointerEvent.currentTarget,
      };
      didDragRef.current = false;
      setIsDragging(true);
    },
    [displayTimezone, event.endAt, event.startAt, getMainScrollTop],
  );

  const handlePointerDown = useCallback(
    (pointerEvent: React.PointerEvent, mode: TimelineDragMode) => {
      pointerEvent.stopPropagation();

      if (!isSelected) {
        if (mode !== "move") {
          return;
        }

        didDragRef.current = false;
        tapState.current = {
          startY: pointerEvent.clientY,
          pointerId: pointerEvent.pointerId,
        };
        return;
      }

      startDrag(pointerEvent, mode);
    },
    [isSelected, startDrag],
  );

  const handlePointerMove = useCallback(
    (pointerEvent: React.PointerEvent) => {
      if (tapState.current) {
        if (
          Math.abs(pointerEvent.clientY - tapState.current.startY) >
          TAP_THRESHOLD_PX
        ) {
          tapState.current = null;
        }
        return;
      }

      if (!dragState.current || !timelineRef.current) {
        return;
      }

      const state = dragState.current;
      const main = getMainElement();

      if (main) {
        applyEdgeScroll(pointerEvent.clientY, main);
      }

      const effectiveDeltaY = computeEffectiveDeltaY(
        pointerEvent.clientY,
        state,
      );

      if (Math.abs(effectiveDeltaY) > TAP_THRESHOLD_PX) {
        state.moved = true;
        didDragRef.current = true;
      }

      updatePreview(effectiveDeltaY, state);
    },
    [computeEffectiveDeltaY, getMainElement, timelineRef, updatePreview],
  );

  const buildPayload = useCallback(
    (state: DragState, deltaY: number): DragCompletePayload => {
      const deltaMinutes =
        Math.round(((deltaY / PX_PER_HOUR) * 60) / SNAP_INTERVAL_MINUTES) *
        SNAP_INTERVAL_MINUTES;

      if (state.mode === "move") {
        let nextStart = clampTimelineMinutes(
          state.initialStartMinutes + deltaMinutes,
        );
        let nextEnd = clampTimelineMinutes(
          state.initialEndMinutes + deltaMinutes,
        );
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
        return { ...times, mode: state.mode };
      }

      const times = applyMinutesDeltaToEvent(
        event.startAt,
        event.endAt,
        deltaMinutes,
        state.mode,
      );
      return { ...times, mode: state.mode };
    },
    [clampMoveMinutes, event.endAt, event.startAt],
  );

  const handlePointerUp = useCallback(
    (pointerEvent: React.PointerEvent): PointerUpResult => {
      if (tapState.current) {
        const tap = tapState.current;
        tapState.current = null;

        const moved =
          Math.abs(pointerEvent.clientY - tap.startY) > TAP_THRESHOLD_PX;

        if (!moved) {
          onSelect?.();
          return { payload: null, tapped: true, mode: "move" };
        }

        return { payload: null, tapped: false, mode: null };
      }

      if (!dragState.current) {
        return { payload: null, tapped: false, mode: null };
      }

      const state = dragState.current;
      dragState.current = null;
      setIsDragging(false);

      if (state.captureTarget.hasPointerCapture(state.pointerId)) {
        state.captureTarget.releasePointerCapture(state.pointerId);
      }

      const effectiveDeltaY = computeEffectiveDeltaY(
        pointerEvent.clientY,
        state,
      );

      if (!state.moved) {
        setPreview(null);
        return { payload: null, tapped: true, mode: state.mode };
      }

      const payload = buildPayload(state, effectiveDeltaY);
      setPreview(null);
      return { payload, tapped: false, mode: state.mode };
    },
    [buildPayload, computeEffectiveDeltaY, onSelect],
  );

  const handlePointerCancel = useCallback(() => {
    tapState.current = null;

    if (!dragState.current) {
      return;
    }

    const state = dragState.current;
    if (state.captureTarget.hasPointerCapture(state.pointerId)) {
      state.captureTarget.releasePointerCapture(state.pointerId);
    }

    resetDrag();
  }, [resetDrag]);

  const handleLostPointerCapture = useCallback(
    (pointerEvent: React.PointerEvent) => {
      if (!dragState.current) {
        return;
      }

      if (dragState.current.pointerId !== pointerEvent.pointerId) {
        return;
      }

      resetDrag();
    },
    [resetDrag],
  );

  return {
    basePosition,
    preview,
    isDragging,
    didDragRef,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
    handleLostPointerCapture,
  };
}
