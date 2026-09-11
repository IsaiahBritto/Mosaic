import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { canEncryptSecrets } from "@/lib/integrations/crypto";

function signingKey(): Buffer {
  const hex = process.env.TOKEN_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error("TOKEN_ENCRYPTION_KEY is required for OAuth state");
  }
  return Buffer.from(hex, "hex");
}

function sign(data: string): string {
  return createHmac("sha256", signingKey()).update(data).digest("base64url");
}

type OAuthStatePayload = {
  userId: string;
  nonce: string;
  exp: number;
  reconnectConnectionId?: string;
};

export function createOAuthState(
  userId: string,
  reconnectConnectionId?: string,
): string {
  if (!canEncryptSecrets()) {
    throw new Error("TOKEN_ENCRYPTION_KEY is not configured");
  }

  const payload: OAuthStatePayload = {
    userId,
    nonce: randomBytes(16).toString("hex"),
    exp: Date.now() + 10 * 60 * 1000,
    reconnectConnectionId,
  };

  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${data}.${sign(data)}`;
}

export function verifyOAuthState(
  state: string,
): { userId: string; reconnectConnectionId?: string } | null {
  if (!canEncryptSecrets()) {
    return null;
  }

  const dot = state.indexOf(".");
  if (dot === -1) {
    return null;
  }

  const data = state.slice(0, dot);
  const sig = state.slice(dot + 1);
  const expected = sign(data);

  try {
    const sigBuf = Buffer.from(sig);
    const expectedBuf = Buffer.from(expected);
    if (
      sigBuf.length !== expectedBuf.length ||
      !timingSafeEqual(sigBuf, expectedBuf)
    ) {
      return null;
    }
  } catch {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(data, "base64url").toString("utf8"),
    ) as OAuthStatePayload;

    if (!payload.userId || payload.exp < Date.now()) {
      return null;
    }

    return {
      userId: payload.userId,
      reconnectConnectionId: payload.reconnectConnectionId,
    };
  } catch {
    return null;
  }
}
