import {
  calendarQueryReport,
  extractCalendarDataBlocks,
  extractCalendarResponses,
  extractHref,
  formatCalDavUtc,
  propfindCalendarHome,
  propfindCalendars,
  propfindCurrentUserPrincipal,
} from "@/lib/integrations/apple/caldav-xml";

export type CalDavCredentials = {
  username: string;
  password: string;
  baseUrl: string;
};

export type AppleCalendarListItem = {
  id: string;
  href: string;
  name: string;
  accessRole: string;
  colorHex?: string;
};

export class CalDavClient {
  constructor(private credentials: CalDavCredentials) {}

  private authHeader(): string {
    const token = Buffer.from(
      `${this.credentials.username}:${this.credentials.password}`,
    ).toString("base64");
    return `Basic ${token}`;
  }

  private async request(
    url: string,
    method: string,
    body?: string,
    headers: Record<string, string> = {},
  ): Promise<Response> {
    return fetch(url, {
      method,
      headers: {
        Authorization: this.authHeader(),
        "Content-Type": "application/xml; charset=utf-8",
        ...headers,
      },
      body,
    });
  }

  async validateCredentials(): Promise<{ ok: true; resolvedUrl: string } | { ok: false; error: string }> {
    const discoveryUrls = [
      `${this.credentials.baseUrl}/.well-known/caldav`,
      this.credentials.baseUrl,
    ];

    for (const url of discoveryUrls) {
      const response = await this.request(
        url,
        "PROPFIND",
        propfindCurrentUserPrincipal(),
        { Depth: "0" },
      );

      if (response.status === 401 || response.status === 403) {
        return { ok: false, error: "apple_invalid_credentials" };
      }

      if (response.status === 207 || response.ok) {
        return { ok: true, resolvedUrl: url.replace("/.well-known/caldav", "") || this.credentials.baseUrl };
      }
    }

    return { ok: false, error: "apple_invalid_credentials" };
  }

  async discoverCalendars(resolvedBaseUrl?: string): Promise<AppleCalendarListItem[]> {
    const base = resolvedBaseUrl ?? this.credentials.baseUrl;

    const principalResponse = await this.request(
      `${base}/.well-known/caldav`,
      "PROPFIND",
      propfindCurrentUserPrincipal(),
      { Depth: "0" },
    );
    const principalXml = await principalResponse.text();
    let principalHref = extractHref(principalXml, "current-user-principal");
    if (!principalHref) {
      principalHref = extractHref(principalXml, "href");
    }
    if (!principalHref) {
      throw new Error("Could not discover CalDAV principal");
    }

    const principalUrl = new URL(principalHref, base).toString();
    const homeResponse = await this.request(
      principalUrl,
      "PROPFIND",
      propfindCalendarHome(),
      { Depth: "0" },
    );
    const homeXml = await homeResponse.text();
    const homeHref = extractHref(homeXml, "calendar-home-set");
    if (!homeHref) {
      throw new Error("Could not discover calendar home");
    }

    const homeUrl = new URL(homeHref, base).toString();
    const calendarsResponse = await this.request(
      homeUrl,
      "PROPFIND",
      propfindCalendars(),
      { Depth: "1" },
    );
    const calendarsXml = await calendarsResponse.text();
    const responses = extractCalendarResponses(calendarsXml);

    return responses
      .filter((r) => r.isCalendar && r.href !== homeHref)
      .map((r, index) => ({
        id: r.href,
        href: new URL(r.href, base).toString(),
        name: r.displayName,
        accessRole: inferAccessRole(r.displayName),
        colorHex: undefined,
      }))
      .map((cal, index) => ({ ...cal, colorHex: undefined }));
  }

  async fetchEvents(
    calendarHref: string,
    rangeStart: Date,
    rangeEnd: Date,
  ): Promise<Array<{ etag: string | null; ics: string }>> {
    const body = calendarQueryReport(
      formatCalDavUtc(rangeStart),
      formatCalDavUtc(rangeEnd),
    );

    const response = await this.request(calendarHref, "REPORT", body, {
      Depth: "1",
    });

    if (!response.ok && response.status !== 207) {
      throw new Error(`CalDAV REPORT failed (${response.status})`);
    }

    const xml = await response.text();
    return extractCalendarDataBlocks(xml).map((block) => ({
      etag: block.etag,
      ics: block.data,
    }));
  }

  async putEvent(
    calendarHref: string,
    uid: string,
    icsBody: string,
    etag?: string | null,
  ): Promise<{ etag: string | null }> {
    const eventUrl = `${calendarHref.replace(/\/$/, "")}/${uid}.ics`;
    const headers: Record<string, string> = {
      "Content-Type": "text/calendar; charset=utf-8",
    };
    if (etag) {
      headers["If-Match"] = etag;
    }

    const response = await this.request(eventUrl, "PUT", icsBody, headers);

    if (response.status === 412) {
      throw new Error("412 Precondition Failed");
    }
    if (!response.ok && response.status !== 201 && response.status !== 204) {
      throw new Error(`CalDAV PUT failed (${response.status})`);
    }

    return { etag: response.headers.get("etag") };
  }

  async deleteEvent(
    calendarHref: string,
    uid: string,
    etag?: string | null,
  ): Promise<void> {
    const eventUrl = `${calendarHref.replace(/\/$/, "")}/${uid}.ics`;
    const headers: Record<string, string> = {};
    if (etag) {
      headers["If-Match"] = etag;
    }

    const response = await this.request(eventUrl, "DELETE", undefined, headers);
    if (response.status === 404) return;
    if (response.status === 412) {
      throw new Error("412 Precondition Failed");
    }
    if (!response.ok && response.status !== 204) {
      throw new Error(`CalDAV DELETE failed (${response.status})`);
    }
  }
}

function inferAccessRole(displayName: string): string {
  const lower = displayName.toLowerCase();
  if (lower.includes("birthday") || lower.includes("holiday") || lower.includes("scheduled")) {
    return "reader";
  }
  return "owner";
}
