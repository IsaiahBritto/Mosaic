"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { ShellLayout } from "@/lib/actions/views";

type ShellLayoutContextValue = {
  layout: ShellLayout;
  setLayout: (layout: ShellLayout) => void;
};

const ShellLayoutContext = createContext<ShellLayoutContextValue | null>(null);

type ShellLayoutProviderProps = {
  initialLayout: ShellLayout;
  children: ReactNode;
};

export function ShellLayoutProvider({
  initialLayout,
  children,
}: ShellLayoutProviderProps) {
  const [layout, setLayoutState] = useState<ShellLayout>(initialLayout);

  const setLayout = useCallback((next: ShellLayout) => {
    setLayoutState(next);
  }, []);

  const value = useMemo(
    () => ({ layout, setLayout }),
    [layout, setLayout],
  );

  return (
    <ShellLayoutContext.Provider value={value}>
      {children}
    </ShellLayoutContext.Provider>
  );
}

export function useShellLayout(): ShellLayoutContextValue {
  const context = useContext(ShellLayoutContext);
  if (!context) {
    throw new Error("useShellLayout must be used within ShellLayoutProvider");
  }
  return context;
}
