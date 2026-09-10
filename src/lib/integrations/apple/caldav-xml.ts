export const DAV = "DAV:";
export const CALDAV = "urn:ietf:params:xml:ns:caldav";

export function propfindCurrentUserPrincipal(): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<D:propfind xmlns:D="${DAV}">
  <D:prop>
    <D:current-user-principal/>
  </D:prop>
</D:propfind>`;
}

export function propfindCalendarHome(): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<D:propfind xmlns:D="${DAV}" xmlns:C="${CALDAV}">
  <D:prop>
    <C:calendar-home-set/>
  </D:prop>
</D:propfind>`;
}

export function propfindCalendars(): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<D:propfind xmlns:D="${DAV}" xmlns:C="${CALDAV}">
  <D:prop>
    <D:displayname/>
    <D:resourcetype/>
    <C:calendar-description/>
    <D:getetag/>
  </D:prop>
</D:propfind>`;
}

export function calendarQueryReport(start: string, end: string): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<C:calendar-query xmlns:D="${DAV}" xmlns:C="${CALDAV}">
  <D:prop>
    <D:getetag/>
    <C:calendar-data/>
  </D:prop>
  <C:filter>
    <C:comp-filter name="VCALENDAR">
      <C:comp-filter name="VEVENT">
        <C:time-range start="${start}" end="${end}"/>
      </C:comp-filter>
    </C:comp-filter>
  </C:filter>
</C:calendar-query>`;
}

/** Extract first href for a prop name from multistatus XML. */
export function extractHref(xml: string, propName: string): string | null {
  const regex = new RegExp(
    `<(?:[a-zA-Z0-9]+:)?${propName}[^>]*>[\\s\\S]*?<(?:[a-zA-Z0-9]+:)?href[^>]*>([^<]+)</(?:[a-zA-Z0-9]+:)?href>`,
    "i",
  );
  const match = xml.match(regex);
  return match?.[1]?.trim() ?? null;
}

export function extractCalendarResponses(xml: string): Array<{
  href: string;
  displayName: string;
  isCalendar: boolean;
  etag: string | null;
}> {
  const responses: Array<{
    href: string;
    displayName: string;
    isCalendar: boolean;
    etag: string | null;
  }> = [];

  const responseBlocks = xml.match(/<(?:[a-zA-Z0-9]+:)?response[\s\S]*?<\/(?:[a-zA-Z0-9]+:)?response>/gi) ?? [];

  for (const block of responseBlocks) {
    const hrefMatch = block.match(/<(?:[a-zA-Z0-9]+:)?href[^>]*>([^<]+)<\/(?:[a-zA-Z0-9]+:)?href>/i);
    if (!hrefMatch) continue;

    const href = hrefMatch[1].trim();
    const displayMatch = block.match(
      /<(?:[a-zA-Z0-9]+:)?displayname[^>]*>([^<]*)<\/(?:[a-zA-Z0-9]+:)?displayname>/i,
    );
    const isCalendar = /<(?:[a-zA-Z0-9]+:)?calendar\s*\/>/i.test(block);
    const etagMatch = block.match(
      /<(?:[a-zA-Z0-9]+:)?getetag[^>]*>([^<]*)<\/(?:[a-zA-Z0-9]+:)?getetag>/i,
    );

    responses.push({
      href,
      displayName: displayMatch?.[1]?.trim() || "Calendar",
      isCalendar,
      etag: etagMatch?.[1]?.trim() ?? null,
    });
  }

  return responses;
}

export function extractCalendarDataBlocks(xml: string): Array<{ etag: string | null; data: string }> {
  const results: Array<{ etag: string | null; data: string }> = [];
  const blocks = xml.match(/<(?:[a-zA-Z0-9]+:)?response[\s\S]*?<\/(?:[a-zA-Z0-9]+:)?response>/gi) ?? [];

  for (const block of blocks) {
    const etagMatch = block.match(
      /<(?:[a-zA-Z0-9]+:)?getetag[^>]*>([^<]*)<\/(?:[a-zA-Z0-9]+:)?getetag>/i,
    );
    const dataMatch = block.match(
      /<(?:[a-zA-Z0-9]+:)?calendar-data[^>]*>([\s\S]*?)<\/(?:[a-zA-Z0-9]+:)?calendar-data>/i,
    );
    if (!dataMatch) continue;

    results.push({
      etag: etagMatch?.[1]?.trim() ?? null,
      data: decodeXmlEntities(dataMatch[1].trim()),
    });
  }

  return results;
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

export function formatCalDavUtc(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}
