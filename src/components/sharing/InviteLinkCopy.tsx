"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

type InviteLinkCopyProps = {
  inviteLink: string;
};

export function InviteLinkCopy({ inviteLink }: InviteLinkCopyProps) {
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      showToast("Invite link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast("Could not copy link", "error");
    }
  }

  return (
    <div className="rounded-lg bg-surface/60 px-3 py-3">
      <p className="mb-2 text-xs uppercase tracking-wide text-text-secondary">
        Invite Link
      </p>
      <p className="mb-3 break-all text-xs text-text-primary">{inviteLink}</p>
      <Button size="sm" onClick={handleCopy}>
        {copied ? "Copied" : "Copy Link"}
      </Button>
    </div>
  );
}
