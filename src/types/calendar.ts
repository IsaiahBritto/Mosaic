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
  disabled?: boolean;
  emptyMessage?: string;
};

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
