import { describe, expect, it } from "vitest";
import { buildReturnTo, sanitizeReturnTo } from "@/lib/navigation/return-to";

describe("return-to navigation", () => {
  it("buildReturnTo encodes path and query", () => {
    expect(buildReturnTo("/month", "date=2026-08-20")).toBe(
      encodeURIComponent("/month?date=2026-08-20"),
    );
  });

  it("sanitizeReturnTo allows app paths", () => {
    const encoded = encodeURIComponent("/month?date=2026-08-20");
    expect(sanitizeReturnTo(encoded)).toBe("/month?date=2026-08-20");
  });

  it("sanitizeReturnTo rejects external URLs", () => {
    expect(sanitizeReturnTo(encodeURIComponent("https://evil.com"))).toBeNull();
    expect(sanitizeReturnTo(encodeURIComponent("//evil.com"))).toBeNull();
  });

  it("sanitizeReturnTo rejects unknown paths", () => {
    expect(sanitizeReturnTo(encodeURIComponent("/admin"))).toBeNull();
  });
});
