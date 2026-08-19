import {
  eachDayOfInterval,
  endOfDay,
  endOfYear,
  parseISO,
  startOfDay,
  startOfYear,
} from "date-fns";
import { formatInTimeZone, toZonedTime } from "date-fns-tz";
import type { EventInstance } from "@/types/event";

export type MosaicDay = {
  date: string;
  colors: string[];
};

function dateKey(date: Date, timezone: string): string {
  return formatInTimeZone(date, timezone, "yyyy-MM-dd");
}

function eventsOnDate(
  date: Date,
  events: EventInstance[],
  timezone: string,
): EventInstance[] {
  const dayStart = startOfDay(toZonedTime(date, timezone));
  const dayEnd = endOfDay(toZonedTime(date, timezone));

  return events.filter((event) => {
    const start = parseISO(event.startAt);
    const end = parseISO(event.endAt);
    return end >= dayStart && start <= dayEnd;
  });
}

export function getDayMosaicColors(
  date: Date,
  events: EventInstance[],
  timezone: string,
): string[] {
  const dayEvents = eventsOnDate(date, events, timezone).sort(
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
  const yearStart = startOfYear(new Date(year, 0, 1));
  const yearEnd = endOfYear(new Date(year, 0, 1));
  const days = eachDayOfInterval({ start: yearStart, end: yearEnd });

  return days.map((date) => ({
    date: dateKey(date, timezone),
    colors: getDayMosaicColors(date, events, timezone),
  }));
}
