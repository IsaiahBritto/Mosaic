import type { GoogleCalendarListItem } from "@/lib/integrations/sync-types";

export function normalizeGoogleCalendarLabel(
  calendar: Pick<GoogleCalendarListItem, "summary" | "primary">,
  accountEmail: string,
): string {
  const summary = calendar.summary.trim();
  if (summary.length === 0) {
    return calendar.primary ? "Primary calendar" : "Calendar";
  }

  if (summary.toLowerCase() === accountEmail.toLowerCase()) {
    return "Primary calendar";
  }

  return summary;
}

export function isAccountIdentityCalendar(
  calendar: Pick<GoogleCalendarListItem, "id" | "primary">,
  accountEmail: string,
): boolean {
  return (
    calendar.primary === true &&
    calendar.id.toLowerCase() === accountEmail.toLowerCase()
  );
}

export function getAccountHeaderState(
  selectedIds: string[],
  childIds: string[],
): { allSelected: boolean; toggleNext: boolean } {
  if (childIds.length === 0) {
    return { allSelected: false, toggleNext: true };
  }

  const selectedCount = childIds.filter((id) => selectedIds.includes(id)).length;
  const allSelected = selectedCount === childIds.length;
  return { allSelected, toggleNext: !allSelected };
}

export function getVisibilityHeaderState(
  visibleIds: string[],
  childIds: string[],
): { allVisible: boolean; toggleNext: boolean } {
  if (childIds.length === 0) {
    return { allVisible: false, toggleNext: true };
  }

  const visibleCount = childIds.filter((id) => visibleIds.includes(id)).length;
  const allVisible = visibleCount === childIds.length;
  return { allVisible, toggleNext: !allVisible };
}
