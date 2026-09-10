import type { IntegrationProvider } from "@/lib/integrations/types";

export type SyncStatus = "synced" | "pending_push" | "conflict";

export type EventSnapshot = {
  title: string;
  location: string | null;
  notes: string | null;
  startAt: string;
  endAt: string;
  isAllDay: boolean;
  timezone: string;
  externalUpdatedAt?: string | null;
  externalEtag?: string | null;
};

export type ConflictPayload = {
  mosaic: EventSnapshot;
  external: EventSnapshot;
  provider: IntegrationProvider;
};

export type ConflictSummary = {
  eventId: string;
  calendarId: string;
  calendarName: string;
  title: string;
  provider: IntegrationProvider;
};

export type ResyncResult = {
  synced: number;
  pulled: number;
  pushed: number;
  conflicts: ConflictSummary[];
  errors: string[];
};

export type GoogleCalendarListItem = {
  id: string;
  summary: string;
  backgroundColor?: string;
  accessRole: string;
  primary?: boolean;
  selected?: boolean;
};

export type SelectedGoogleCalendar = {
  externalCalendarId: string;
  name: string;
  colorHex: string;
  accessRole?: string;
};

export type AppleCalendarListItem = {
  id: string;
  href: string;
  name: string;
  accessRole: string;
};

export type SelectedAppleCalendar = {
  externalCalendarId: string;
  caldavPath: string;
  name: string;
  colorHex: string;
  accessRole?: string;
};
