export type CalendarRole = "owner" | "editor" | "viewer";
export type CalendarType = "native" | "shared";
export type CalendarSource = "native" | "google" | "apple";

export type Calendar = {
  id: string;
  name: string;
  colorHex: string;
  type: CalendarType;
  source: CalendarSource;
  ownerId: string;
  isVisible: boolean;
  role: CalendarRole;
  connectionId?: string | null;
  readOnly?: boolean;
  canonicalName?: string;
  canonicalColorHex?: string;
  hasPersonalOverride?: boolean;
};

export type CalendarGroupLabel =
  | "NATIVE"
  | "SHARED"
  | "LINKED"
  | "LINKED_GOOGLE"
  | "LINKED_APPLE";

export type CalendarGroup = {
  label: CalendarGroupLabel;
  title: string;
  calendars: Calendar[];
  connectionId?: string;
  accountEmail?: string;
  providerAccountEmail?: string;
  accountDisplayName?: string | null;
  provider?: "google" | "apple";
  lastSyncStatus?: "ok" | "error" | "syncing" | null;
  lastSyncError?: string | null;
  disabled?: boolean;
  emptyMessage?: string;
};

export type SidebarCalendarItem = {
  kind: "calendar";
  calendar: Calendar;
};

export type SidebarConnectionItem = {
  kind: "connection";
  connectionId: string;
  title: string;
  provider: "google" | "apple";
  providerAccountEmail: string;
  accountDisplayName?: string | null;
  lastSyncStatus?: "ok" | "error" | "syncing" | null;
  lastSyncError?: string | null;
  calendars: Calendar[];
};

export type SidebarItem = SidebarCalendarItem | SidebarConnectionItem;

export type CalendarRow = {
  id: string;
  owner_id: string;
  name: string;
  color_hex: string;
  type: CalendarType;
  is_visible_default: boolean;
  created_at: string;
  role: CalendarRole;
};
