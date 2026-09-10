import { addDays, format, parseISO } from "date-fns";
import ICAL from "ical.js";
import type { EventSnapshot } from "@/lib/integrations/sync-types";

const DEFAULT_APPLE_COLORS = [
  "#FF9500",
  "#5856D6",
  "#34C759",
  "#FF2D55",
  "#5AC8FA",
  "#AF52DE",
];

export function mapAppleColor(index: number): string {
  return DEFAULT_APPLE_COLORS[index % DEFAULT_APPLE_COLORS.length];
}

export function parseIcsEvents(icsData: string): Array<{
  uid: string;
  etag: string | null;
  snapshot: EventSnapshot;
  sequence: number;
}> {
  const jcal = ICAL.parse(icsData);
  const comp = new ICAL.Component(jcal);
  const vevents = comp.getAllSubcomponents("vevent");
  const results: Array<{
    uid: string;
    etag: string | null;
    snapshot: EventSnapshot;
    sequence: number;
  }> = [];

  for (const vevent of vevents) {
    const event = new ICAL.Event(vevent);
    const uid = event.uid;
    if (!uid) continue;

    const isAllDay = Boolean(event.startDate?.isDate);
    let startAt: string;
    let endAt: string;
    let timezone = "UTC";

    if (isAllDay && event.startDate && event.endDate) {
      const startDate = format(event.startDate.toJSDate(), "yyyy-MM-dd");
      startAt = `${startDate}T00:00:00.000Z`;
      const endJs = event.endDate.toJSDate();
      endAt = format(addDays(endJs, -1), "yyyy-MM-dd'T'23:59:59.000'Z'");
    } else {
      startAt = event.startDate?.toJSDate().toISOString() ?? new Date().toISOString();
      endAt = event.endDate?.toJSDate().toISOString() ?? startAt;
      timezone = event.startDate?.zone?.tzid ?? "UTC";
    }

    results.push({
      uid,
      etag: null,
      sequence: event.sequence ?? 0,
      snapshot: {
        title: (event.summary ?? "(No title)").slice(0, 500),
        location: event.location?.slice(0, 500) ?? null,
        notes: event.description?.slice(0, 5000) ?? null,
        startAt,
        endAt,
        isAllDay,
        timezone,
      },
    });
  }

  return results;
}

export function mosaicEventToIcs(event: {
  uid: string;
  title: string;
  location: string | null;
  notes: string | null;
  startAt: string;
  endAt: string;
  isAllDay: boolean;
  timezone: string;
  sequence: number;
}): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Mosaic//CalDAV//EN",
    "BEGIN:VEVENT",
    `UID:${event.uid}`,
    `SEQUENCE:${event.sequence}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
  ];

  if (event.location) {
    lines.push(`LOCATION:${escapeIcsText(event.location)}`);
  }
  if (event.notes) {
    lines.push(`DESCRIPTION:${escapeIcsText(event.notes)}`);
  }

  if (event.isAllDay) {
    lines.push(`DTSTART;VALUE=DATE:${format(parseISO(event.startAt), "yyyyMMdd")}`);
    lines.push(
      `DTEND;VALUE=DATE:${format(addDays(parseISO(event.endAt), 1), "yyyyMMdd")}`,
    );
  } else {
    lines.push(`DTSTART:${toIcsUtc(event.startAt)}`);
    lines.push(`DTEND:${toIcsUtc(event.endAt)}`);
  }

  lines.push(`DTSTAMP:${toIcsUtc(new Date().toISOString())}`);
  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.join("\r\n");
}

function escapeIcsText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function toIcsUtc(iso: string): string {
  return parseISO(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export function snapshotFromMosaicRow(row: {
  title: string;
  location: string | null;
  notes: string | null;
  start_at: string;
  end_at: string;
  is_all_day: boolean;
  timezone: string;
  external_updated_at?: string | null;
  external_etag?: string | null;
}): EventSnapshot {
  return {
    title: row.title,
    location: row.location,
    notes: row.notes,
    startAt: row.start_at,
    endAt: row.end_at,
    isAllDay: row.is_all_day,
    timezone: row.timezone,
    externalUpdatedAt: row.external_updated_at ?? null,
    externalEtag: row.external_etag ?? null,
  };
}
