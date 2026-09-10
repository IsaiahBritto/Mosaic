import { describe, expect, it } from "vitest";
import {
  extractCalendarResponses,
  extractHref,
  propfindCurrentUserPrincipal,
} from "@/lib/integrations/apple/caldav-xml";

describe("caldav-xml", () => {
  it("builds PROPFIND for current-user-principal", () => {
    const xml = propfindCurrentUserPrincipal();
    expect(xml).toContain("current-user-principal");
    expect(xml).toContain("propfind");
  });

  it("extracts href from multistatus", () => {
    const sample = `<?xml version="1.0"?>
<D:multistatus xmlns:D="DAV:">
  <D:response>
    <D:propstat>
      <D:prop>
        <D:current-user-principal>
          <D:href>/123456/principal/</D:href>
        </D:current-user-principal>
      </D:prop>
    </D:propstat>
  </D:response>
</D:multistatus>`;

    expect(extractHref(sample, "current-user-principal")).toBe(
      "/123456/principal/",
    );
  });

  it("extracts calendar resources from PROPFIND response", () => {
    const sample = `<?xml version="1.0"?>
<D:multistatus xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
  <D:response>
    <D:href>/calendars/home/work/</D:href>
    <D:propstat>
      <D:prop>
        <D:displayname>Work</D:displayname>
        <D:resourcetype><D:collection/><C:calendar/></D:resourcetype>
      </D:prop>
    </D:propstat>
  </D:response>
</D:multistatus>`;

    const calendars = extractCalendarResponses(sample);
    expect(calendars.some((c) => c.displayName === "Work" && c.isCalendar)).toBe(
      true,
    );
  });
});
