"use client";

import { useState, useTransition } from "react";
import { connectAppleCalendar } from "@/lib/actions/integrations";
import { AppleConnectGuide } from "@/components/integrations/AppleConnectGuide";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

export function AppleConnect() {
  const { showToast } = useToast();
  const [appleId, setAppleId] = useState("");
  const [appPassword, setAppPassword] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await connectAppleCalendar({ appleId, appPassword });
      if (!result.success) {
        showToast(result.message, "error");
        return;
      }
      showToast("Apple/iCloud connected");
      setAppPassword("");
    });
  }

  return (
    <div className="rounded-lg bg-surface/60 px-4 py-4">
      <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-text-secondary">
        Linked: i-Cloud
      </h3>
      <AppleConnectGuide />
      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
        <Input
          label="Apple ID Email"
          type="email"
          value={appleId}
          onChange={(e) => setAppleId(e.target.value)}
          required
        />
        <Input
          label="App-Specific Password"
          type="password"
          value={appPassword}
          onChange={(e) => setAppPassword(e.target.value)}
          required
        />
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "Connecting…" : "Connect iCloud"}
        </Button>
      </form>
    </div>
  );
}
