import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/integrations/google/sync", () => ({
  syncGoogleConnection: vi.fn(async () => ({
    connectionId: "g1",
    provider: "google",
    pulled: 1,
    pushed: 0,
    errors: [],
    conflicts: [],
  })),
}));

vi.mock("@/lib/integrations/apple/sync", () => ({
  syncAppleConnection: vi.fn(async () => ({
    connectionId: "a1",
    provider: "apple",
    pulled: 2,
    pushed: 1,
    errors: [],
    conflicts: [],
  })),
}));

import { syncConnectionByProvider } from "@/lib/integrations/registry";
import { syncGoogleConnection } from "@/lib/integrations/google/sync";
import { syncAppleConnection } from "@/lib/integrations/apple/sync";

describe("syncConnectionByProvider", () => {
  it("dispatches google provider", async () => {
    const supabase = {} as never;
    const result = await syncConnectionByProvider(supabase, "g1", "google");
    expect(syncGoogleConnection).toHaveBeenCalledWith(supabase, "g1", undefined);
    expect(result.provider).toBe("google");
    expect(result.pulled).toBe(1);
  });

  it("dispatches apple provider", async () => {
    const supabase = {} as never;
    const result = await syncConnectionByProvider(supabase, "a1", "apple");
    expect(syncAppleConnection).toHaveBeenCalledWith(supabase, "a1", undefined);
    expect(result.provider).toBe("apple");
    expect(result.pulled).toBe(2);
  });
});
