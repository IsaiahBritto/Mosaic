import { CalDavClient } from "@/lib/integrations/apple/caldav-client";

const DEFAULT_CALDAV_URL = "https://caldav.icloud.com";

export async function validateAppleCredentials(
  appleId: string,
  appPassword: string,
  caldavUrl = DEFAULT_CALDAV_URL,
): Promise<
  | { ok: true; resolvedUrl: string }
  | { ok: false; error: string }
> {
  const client = new CalDavClient({
    username: appleId.toLowerCase(),
    password: appPassword,
    baseUrl: caldavUrl,
  });

  return client.validateCredentials();
}

export async function discoverAppleCalendars(
  appleId: string,
  appPassword: string,
  caldavUrl = DEFAULT_CALDAV_URL,
  resolvedBaseUrl?: string,
) {
  const client = new CalDavClient({
    username: appleId.toLowerCase(),
    password: appPassword,
    baseUrl: caldavUrl,
  });

  return client.discoverCalendars(resolvedBaseUrl ?? caldavUrl);
}
