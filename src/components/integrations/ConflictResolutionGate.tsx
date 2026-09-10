"use client";

import { useEffect, useState } from "react";
import { getUnresolvedConflicts } from "@/lib/actions/sync";
import { ConflictResolutionQueue } from "@/components/integrations/ConflictResolutionQueue";

export function ConflictResolutionGate() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    void getUnresolvedConflicts().then((result) => {
      if (result.success && result.data.length > 0) {
        setOpen(true);
      }
    });
  }, []);

  if (!open) return null;

  return <ConflictResolutionQueue onAllResolved={() => setOpen(false)} />;
}
