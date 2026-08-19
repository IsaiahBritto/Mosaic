"use client";

import { useEffect, useRef } from "react";
import { syncDefaultTimezone } from "@/lib/actions/views";
import { getUserTimezone } from "@/lib/calendar/timezone";

export function TimezoneSync() {
  const synced = useRef(false);

  useEffect(() => {
    if (synced.current) {
      return;
    }

    synced.current = true;
    const timezone = getUserTimezone();
    void syncDefaultTimezone(timezone);
  }, []);

  return null;
}
