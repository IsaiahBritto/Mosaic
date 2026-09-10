import { addDays, format, parseISO } from "date-fns";
import type { GoogleEvent } from "@/lib/integrations/google/client";
import type { EventSnapshot } from "@/lib/integrations/sync-types";

const GOOGLE_COLORS: Record<string, string> = {
  "#ac725e": "#AC725E",
  "#d06b64": "#D06B64",
  "#f83a22": "#F83A22",
  "#fa573c": "#FA573C",
  "#ff7537": "#FF7537",
  "#ffad46": "#FFAD46",
  "#42d692": "#42D692",
  "#16a765": "#16A765",
  "#7bd148": "#7BD148",
  "#cabdbf": "#CABDBF",
  "#cca6ac": "#CCA6AC",
  "#f691b2": "#F691B2",
  "#cd74e6": "#CD74E6",
  "#a47ae2": "#A47AE2",
  "#4986e7": "#4986E7",
  "#9fc6e7": "#9FC6E7",
  "#9a9cff": "#9A9CFF",
  "#b99aff": "#B99AFF",
  "#c2c2c2": "#C2C2C2",
};

export function mapGoogleColor(backgroundColor?: string): string {
  if (!backgroundColor) return "#4986E7";
  const normalized = backgroundColor.toLowerCase();
  return GOOGLE_COLORS[normalized] ?? backgroundColor.toUpperCase();
}

export function googleEventToSnapshot(event: GoogleEvent): EventSnapshot {
  const isAllDay = Boolean(event.start?.date);
  let startAt: string;
  let endAt: string;

  if (isAllDay && event.start?.date && event.end?.date) {
    startAt = `${event.start.date}T00:00:00.000Z`;
    const endDate = parseISO(event.end.date);
    endAt = format(addDays(endDate, -1), "yyyy-MM-dd'T'23:59:59.000'Z'");
  } else {
    startAt = event.start?.dateTime ?? new Date().toISOString();
    endAt = event.end?.dateTime ?? startAt;
  }

  return {
    title: event.summary?.slice(0, 500) ?? "(No title)",
    location: event.location?.slice(0, 500) ?? null,
    notes: event.description?.slice(0, 5000) ?? null,
    startAt,
    endAt,
    isAllDay,
    timezone: event.start?.timeZone ?? "UTC",
    externalUpdatedAt: event.updated ?? null,
    externalEtag: event.etag ?? null,
  };
}

export function mosaicEventToGoogleBody(event: {
  title: string;
  location: string | null;
  notes: string | null;
  startAt: string;
  endAt: string;
  isAllDay: boolean;
  timezone: string;
}): Record<string, unknown> {
  if (event.isAllDay) {
    const startDate = format(parseISO(event.startAt), "yyyy-MM-dd");
    const endDate = format(addDays(parseISO(event.endAt), 1), "yyyy-MM-dd");
    return {
      summary: event.title.slice(0, 500),
      location: event.location?.slice(0, 500) ?? undefined,
      description: event.notes?.slice(0, 5000) ?? undefined,
      start: { date: startDate },
      end: { date: endDate },
    };
  }

  return {
    summary: event.title.slice(0, 500),
    location: event.location?.slice(0, 500) ?? undefined,
    description: event.notes?.slice(0, 5000) ?? undefined,
    start: { dateTime: event.startAt, timeZone: event.timezone },
    end: { dateTime: event.endAt, timeZone: event.timezone },
  };
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

export function isCalendarReadOnly(accessRole: string | null | undefined): boolean {
  return accessRole === "reader" || accessRole === "freeBusyReader";
}
