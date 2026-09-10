import { describe, expect, it } from "vitest";
import { shouldRunDailySync } from "@/lib/integrations/sync.service";

describe("shouldRunDailySync", () => {
  it("returns false outside midnight NY hour", () => {
    const noonNy = new Date("2026-03-15T16:00:00.000Z"); // noon EDT
    expect(shouldRunDailySync(null, noonNy)).toBe(false);
  });

  it("returns true at midnight NY when not yet synced today", () => {
    const midnightNy = new Date("2026-03-15T04:00:00.000Z"); // midnight EDT
    expect(shouldRunDailySync("2026-03-14", midnightNy)).toBe(true);
  });

  it("returns false when already synced today", () => {
    const midnightNy = new Date("2026-03-15T04:00:00.000Z");
    expect(shouldRunDailySync("2026-03-15", midnightNy)).toBe(false);
  });
});
