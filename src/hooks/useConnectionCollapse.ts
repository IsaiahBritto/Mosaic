"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "mosaic-connection-collapsed";

type CollapsedMap = Record<string, boolean>;

function readCollapsedMap(): CollapsedMap {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as CollapsedMap;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function useConnectionCollapse() {
  const [collapsedMap, setCollapsedMap] = useState<CollapsedMap>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setCollapsedMap(readCollapsedMap());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) {
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(collapsedMap));
  }, [collapsedMap, ready]);

  const isCollapsed = useCallback(
    (connectionId: string) => collapsedMap[connectionId] === true,
    [collapsedMap],
  );

  const toggleCollapsed = useCallback((connectionId: string) => {
    setCollapsedMap((current) => ({
      ...current,
      [connectionId]: !current[connectionId],
    }));
  }, []);

  return { isCollapsed, toggleCollapsed, ready };
}
