import { parseISO } from "date-fns";
import {
  addCalendarDays,
  getCalendarDayUtcRange,
} from "@/lib/calendar/timezone";
import type { EventInstance } from "@/types/event";

export type MosaicDay = {
  date: string;
  colors: string[];
};

function eventsOnDate(
  dateParam: string,
  events: EventInstance[],
  timezone: string,
): EventInstance[] {
  const { start: dayStart, end: dayEnd } = getCalendarDayUtcRange(dateParam, timezone);

  return events.filter((event) => {
    const start = parseISO(event.startAt);
    const end = parseISO(event.endAt);
    return end >= dayStart && start <= dayEnd;
  });
}

export function getDayMosaicColors(
  dateParam: string,
  events: EventInstance[],
  timezone: string,
): string[] {
  const dayEvents = eventsOnDate(dateParam, events, timezone).sort(
    (a, b) => parseISO(a.startAt).getTime() - parseISO(b.startAt).getTime(),
  );

  const colors: string[] = [];
  const seen = new Set<string>();

  for (const event of dayEvents) {
    if (seen.has(event.calendarColor)) {
      continue;
    }
    seen.add(event.calendarColor);
    colors.push(event.calendarColor);
  }

  return colors;
}

export function buildYearMosaicDays(
  year: number,
  events: EventInstance[],
  timezone: string,
): MosaicDay[] {
  const days: MosaicDay[] = [];
  const yearEnd = `${year}-12-31`;
  let current = `${year}-01-01`;

  while (current <= yearEnd) {
    days.push({
      date: current,
      colors: getDayMosaicColors(current, events, timezone),
    });
    current = addCalendarDays(current, 1, timezone);
  }

  return days;
}
