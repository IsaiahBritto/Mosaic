"use client";

import { useCallback, useRef, useState } from "react";

const DEFAULT_THRESHOLD = 12;

export function useScrollCollapse(threshold = DEFAULT_THRESHOLD) {
  const [collapsed, setCollapsed] = useState(false);
  const lastScrollY = useRef(0);

  const onScroll = useCallback(
    (event: React.UIEvent<HTMLElement>) => {
      const scrollY = event.currentTarget.scrollTop;
      const delta = scrollY - lastScrollY.current;

      if (scrollY <= 0) {
        setCollapsed(false);
      } else if (delta > threshold) {
        setCollapsed(true);
      } else if (delta < -threshold) {
        setCollapsed(false);
      }

      lastScrollY.current = scrollY;
    },
    [threshold],
  );

  return { collapsed, onScroll };
}
