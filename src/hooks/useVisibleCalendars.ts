"use client";

import { useCallback, useState } from "react";

/**
 * Client hook for optimistic visible-calendar toggles.
 * Initial IDs come from the server; call syncFromServer after refresh.
 */
export function useVisibleCalendars(initialVisibleIds: string[]) {
  const [visibleIds, setVisibleIds] = useState<string[]>(initialVisibleIds);

  const syncFromServer = useCallback((ids: string[]) => {
    setVisibleIds(ids);
  }, []);

  const toggleVisibility = useCallback((calendarId: string, visible: boolean) => {
    setVisibleIds((current) =>
      visible
        ? [...new Set([...current, calendarId])]
        : current.filter((id) => id !== calendarId),
    );
  }, []);

  const setAllVisible = useCallback((allIds: string[], visible: boolean) => {
    setVisibleIds(visible ? allIds : []);
  }, []);

  return {
    visibleIds,
    syncFromServer,
    toggleVisibility,
    setAllVisible,
    isVisible: (calendarId: string) => visibleIds.includes(calendarId),
  };
}
