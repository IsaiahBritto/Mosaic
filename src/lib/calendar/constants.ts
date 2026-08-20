/** Layout and availability constants for calendar views. */
export const PX_PER_HOUR = 80;
export const TIMELINE_DAY_START_HOUR = 0;
export const TIMELINE_DAY_END_HOUR = 23;
export const MIN_EVENT_HEIGHT_PX = 40;
/** Vertical inset so first/last hour labels are not clipped. */
export const TIMELINE_EDGE_PADDING_PX = 16;

export const WAKING_START_HOUR = 8;
export const WAKING_END_HOUR = 24;
export const PARTIAL_THRESHOLD = 0.5;
export const BUSY_EVENT_COUNT = 3;

export const TIMELINE_TOTAL_HOURS =
  TIMELINE_DAY_END_HOUR - TIMELINE_DAY_START_HOUR + 1;
export const TIMELINE_CONTENT_HEIGHT_PX = TIMELINE_TOTAL_HOURS * PX_PER_HOUR;
export const TIMELINE_HEIGHT_PX =
  TIMELINE_CONTENT_HEIGHT_PX + 2 * TIMELINE_EDGE_PADDING_PX;
