export type CalendarRole = "owner" | "editor" | "viewer";
export type CalendarType = "native" | "shared";

export type Calendar = {
  id: string;
  name: string;
  colorHex: string;
  type: CalendarType;
  ownerId: string;
  isVisible: boolean;
  role: CalendarRole;
};

export type CalendarGroupLabel = "NATIVE" | "SHARED" | "LINKED";

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
