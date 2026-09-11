"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateGoogleConnectionDisplayName } from "@/lib/actions/integrations";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";

type EditLinkedAccountDialogProps = {
  connectionId: string;
  providerAccountEmail: string;
  displayName: string | null;
  onClose: () => void;
};

export function EditLinkedAccountDialog({
  connectionId,
  providerAccountEmail,
  displayName,
  onClose,
}: EditLinkedAccountDialogProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const currentLabel = displayName?.trim() || providerAccountEmail;
  const [label, setLabel] = useState(currentLabel);
  const hasCustomLabel = displayName != null && displayName.trim().length > 0;

  function handleSave() {
    const trimmed = label.trim();
    if (!trimmed) {
      showToast("Name is required", "error");
      return;
    }

    startTransition(async () => {
      const result = await updateGoogleConnectionDisplayName({
        connectionId,
        displayName: trimmed === providerAccountEmail ? null : trimmed,
      });

      if (!result.success) {
        showToast(result.message, "error");
        return;
      }

      showToast("Linked account updated");
      onClose();
      router.refresh();
    });
  }

  function handleReset() {
    startTransition(async () => {
      const result = await updateGoogleConnectionDisplayName({
        connectionId,
        displayName: null,
      });

      if (!result.success) {
        showToast(result.message, "error");
        return;
      }

      showToast("Reset to email");
      onClose();
      router.refresh();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div
        className="w-full max-w-md rounded-xl bg-background p-4 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-linked-account-title"
      >
        <h2
          id="edit-linked-account-title"
          className="mb-4 text-lg font-semibold text-text-primary"
        >
          Edit linked account
        </h2>

        <p className="mb-3 text-xs text-text-secondary">
          Linked as {providerAccountEmail}
        </p>

        <div className="mb-4">
          <Input
            label="Name"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            required
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={handleSave} disabled={isPending}>
            {isPending ? "Saving…" : "Save"}
          </Button>
          <Button size="sm" variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          {hasCustomLabel ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleReset}
              disabled={isPending}
            >
              Reset to email
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
