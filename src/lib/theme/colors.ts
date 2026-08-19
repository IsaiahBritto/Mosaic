/** Calendar event color palette — 13 swatches from Mosaic design. */
export const CALENDAR_PALETTE = [
  "#D5D9DB",
  "#00B2F6",
  "#3BEBF5",
  "#2DE0C8",
  "#5AE072",
  "#B3E65C",
  "#FFE45E",
  "#FFC95E",
  "#FA9F5A",
  "#FA7C69",
  "#F863B7",
  "#E07ECB",
  "#9379E0",
] as const;

export const THEME = {
  background: "#1A1A1A",
  surface: "#2A2A2A",
  accent: "#D4AF37",
  textPrimary: "#FFFFFF",
  textSecondary: "#A0A0A0",
  statusFree: "#10B981",
  statusBusy: "#EF4444",
  statusHoliday: "#D4AF37",
  travelTime: "#00B2F6",
} as const;

export type CalendarPaletteColor = (typeof CALENDAR_PALETTE)[number];

/** Default calendar color for new Personal calendar. */
export const DEFAULT_CALENDAR_COLOR: CalendarPaletteColor = "#9379E0";

export function isPaletteColor(hex: string): hex is CalendarPaletteColor {
  return (CALENDAR_PALETTE as readonly string[]).includes(hex);
}

/** Returns white or dark text for readable contrast on a given background hex. */
export function getContrastText(hex: string): "#FFFFFF" | "#1A1A1A" {
  const normalized = hex.replace("#", "");
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#1A1A1A" : "#FFFFFF";
}
