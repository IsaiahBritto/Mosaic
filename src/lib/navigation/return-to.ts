const ALLOWED_PREFIXES = ["/month", "/week", "/year", "/mosaic", "/calendars"] as const;

/** Encode current path + query for safe post-form navigation. */
export function buildReturnTo(pathname: string, search: string): string {
  const path = search ? `${pathname}?${search}` : pathname;
  return encodeURIComponent(path);
}

/** Decode and validate a returnTo param — only same-app paths allowed. */
export function sanitizeReturnTo(value: string | undefined | null): string | null {
  if (!value) {
    return null;
  }

  let decoded: string;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return null;
  }

  if (!decoded.startsWith("/") || decoded.startsWith("//")) {
    return null;
  }

  const pathOnly = decoded.split("?")[0] ?? decoded;
  const allowed = ALLOWED_PREFIXES.some(
    (prefix) => pathOnly === prefix || pathOnly.startsWith(`${prefix}/`),
  );

  return allowed ? decoded : null;
}
