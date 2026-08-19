"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createCalendar } from "@/lib/actions/calendars";
import { DEFAULT_CALENDAR_COLOR } from "@/lib/theme/colors";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ColorPicker } from "@/components/calendar/ColorPicker";
import { ColorBar } from "@/components/ui/ColorBar";
import { useToast } from "@/components/ui/Toast";

export function NewCalendarForm() {
  const router = useRouter();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [colorHex, setColorHex] = useState<string>(DEFAULT_CALENDAR_COLOR);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await createCalendar({
        name,
        colorHex,
        inviteEmail: inviteEmail || undefined,
      });

      if (!result.success) {
        setError(result.message);
        showToast(result.message, "error");
        return;
      }

      showToast(`Created "${result.data.name}"`);
      setName("");
      setInviteEmail("");
      setColorHex(DEFAULT_CALENDAR_COLOR);
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 border-t border-surface px-4 py-4">
      <div className="flex items-stretch gap-3 rounded-lg bg-background px-3 py-3 ring-1 ring-text-secondary/10">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Input
            label="+ New Calendar Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Dance"
            required
          />
          <Input
            label="Invite to share: Email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="email@example.com"
            type="email"
          />
          <span className="text-xs text-text-secondary">{colorHex}</span>
        </div>
        <ColorBar color={colorHex} className="w-2 rounded-sm" />
      </div>

      <ColorPicker value={colorHex} onChange={setColorHex} />

      {error ? <p className="text-sm text-status-busy">{error}</p> : null}

      <Button type="submit" size="lg" disabled={isPending || !name.trim()}>
        {isPending ? "Adding…" : "Add New"}
      </Button>
    </form>
  );
}
