"use client";

import { useEffect, useRef } from "react";
import { LayoutSelector } from "@/components/shell/profile/LayoutSelector";

type ProfilePanelProps = {
  open: boolean;
  onClose: () => void;
  displayName: string;
};

export function ProfilePanel({ open, onClose, displayName }: ProfilePanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      panelRef.current?.focus();
    }
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close profile"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Profile"
        className="relative z-10 flex h-full w-full max-w-sm flex-col bg-background shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-surface px-4 py-4">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Profile</h2>
            <p className="text-sm text-text-secondary">{displayName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-3 py-1.5 text-sm text-text-secondary hover:bg-surface/60"
          >
            Close
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <LayoutSelector />
        </div>
      </div>
    </div>
  );
}
