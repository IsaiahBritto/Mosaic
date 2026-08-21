"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ProfilePanel } from "@/components/shell/profile/ProfilePanel";
import { cn } from "@/lib/utils/cn";

type ProfileButtonProps = {
  displayName: string;
  className?: string;
};

function getInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) {
    return "?";
  }
  const parts = trimmed.split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase();
}

export function ProfileButton({ displayName, className }: ProfileButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        aria-label="Open profile"
        onClick={() => setOpen(true)}
        className={cn("h-9 min-w-9 gap-1.5 px-2.5", className)}
      >
        <span
          aria-hidden
          className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/20 text-[10px] font-bold text-accent"
        >
          {getInitials(displayName)}
        </span>
        <span className="hidden text-xs sm:inline">Profile</span>
      </Button>
      <ProfilePanel
        open={open}
        onClose={() => setOpen(false)}
        displayName={displayName}
      />
    </>
  );
}
