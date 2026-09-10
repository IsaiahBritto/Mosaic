import { afterEach, describe, expect, it, vi } from "vitest";
import { createOAuthState, verifyOAuthState } from "@/lib/integrations/oauth-state";

describe("oauth-state", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects tampered state", () => {
    vi.stubEnv(
      "TOKEN_ENCRYPTION_KEY",
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    );

    const state = createOAuthState("user-1");
    const tampered = `${state}x`;
    expect(verifyOAuthState(tampered)).toBeNull();
  });

  it("round-trips valid state", () => {
    vi.stubEnv(
      "TOKEN_ENCRYPTION_KEY",
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    );

    const state = createOAuthState("user-abc");
    expect(verifyOAuthState(state)).toEqual({ userId: "user-abc" });
  });
});
