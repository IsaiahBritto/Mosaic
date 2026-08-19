"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";

export function GoogleConnect() {
  return (
    <div className="rounded-lg bg-surface/60 px-4 py-4">
      <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-text-secondary">
        Linked: Google
      </h3>
      <p className="mb-3 text-sm text-text-secondary">
        Connect Google Calendar for two-way sync.
      </p>
      <Link href="/api/integrations/google/connect">
        <Button size="sm">Connect Google</Button>
      </Link>
    </div>
  );
}
