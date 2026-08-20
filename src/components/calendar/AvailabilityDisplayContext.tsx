"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  setAvailabilityDisplayMode,
  type AvailabilityDisplayMode,
} from "@/lib/actions/views";

type AvailabilityDisplayContextValue = {
  mode: AvailabilityDisplayMode;
  setMode: (mode: AvailabilityDisplayMode) => void;
  isPending: boolean;
};

const AvailabilityDisplayContext =
  createContext<AvailabilityDisplayContextValue | null>(null);

type AvailabilityDisplayProviderProps = {
  initialMode: AvailabilityDisplayMode;
  children: ReactNode;
};

export function AvailabilityDisplayProvider({
  initialMode,
  children,
}: AvailabilityDisplayProviderProps) {
  const router = useRouter();
  const [mode, setModeState] = useState(initialMode);
  const [isPending, startTransition] = useTransition();

  const setMode = useCallback(
    (next: AvailabilityDisplayMode) => {
      setModeState(next);
      startTransition(async () => {
        await setAvailabilityDisplayMode(next);
        router.refresh();
      });
    },
    [router],
  );

  const value = useMemo(
    () => ({ mode, setMode, isPending }),
    [mode, setMode, isPending],
  );

  return (
    <AvailabilityDisplayContext.Provider value={value}>
      {children}
    </AvailabilityDisplayContext.Provider>
  );
}

export function useAvailabilityDisplay(): AvailabilityDisplayContextValue {
  const context = useContext(AvailabilityDisplayContext);
  if (!context) {
    throw new Error(
      "useAvailabilityDisplay must be used within AvailabilityDisplayProvider",
    );
  }
  return context;
}

export function useAvailabilityDisplayMode(): AvailabilityDisplayMode {
  return useAvailabilityDisplay().mode;
}
