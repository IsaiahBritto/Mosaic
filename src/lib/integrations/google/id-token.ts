export function parseGoogleIdToken(idToken: string): {
  sub: string;
  email?: string;
} {
  const parts = idToken.split(".");
  if (parts.length < 2) {
    throw new Error("Invalid id_token");
  }

  const payload = JSON.parse(
    Buffer.from(parts[1], "base64url").toString("utf8"),
  ) as { sub?: string; email?: string };

  if (!payload.sub) {
    throw new Error("id_token missing sub");
  }

  return { sub: payload.sub, email: payload.email };
}
