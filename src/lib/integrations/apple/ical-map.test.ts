import { describe, expect, it } from "vitest";
import {
  mapAppleColor,
  mosaicEventToIcs,
  parseIcsEvents,
} from "@/lib/integrations/apple/ical-map";

describe("parseIcsEvents", () => {
  it("parses timed VEVENT", () => {
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "BEGIN:VEVENT",
      "UID:test-uid-1",
      "SUMMARY:Team standup",
      "DTSTART:20260315T150000Z",
      "DTEND:20260315T153000Z",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const events = parseIcsEvents(ics);
    expect(events).toHaveLength(1);
    expect(events[0].uid).toBe("test-uid-1");
    expect(events[0].snapshot.title).toBe("Team standup");
    expect(events[0].snapshot.isAllDay).toBe(false);
  });

  it("parses all-day VALUE=DATE events", () => {
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "BEGIN:VEVENT",
      "UID:allday-1",
      "SUMMARY:Holiday",
      "DTSTART;VALUE=DATE:20260320",
      "DTEND;VALUE=DATE:20260321",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const events = parseIcsEvents(ics);
    expect(events).toHaveLength(1);
    expect(events[0].snapshot.isAllDay).toBe(true);
    expect(events[0].snapshot.title).toBe("Holiday");
  });
});

describe("mosaicEventToIcs round-trip", () => {
  it("preserves title and uid for timed events", () => {
    const uid = "round-trip-uid";
    const ics = mosaicEventToIcs({
      uid,
      title: "Dentist",
      location: "Main St",
      notes: null,
      startAt: "2026-03-15T15:00:00.000Z",
      endAt: "2026-03-15T16:00:00.000Z",
      isAllDay: false,
      timezone: "America/New_York",
      sequence: 0,
    });

    const parsed = parseIcsEvents(ics);
    expect(parsed[0].uid).toBe(uid);
    expect(parsed[0].snapshot.title).toBe("Dentist");
    expect(parsed[0].snapshot.location).toBe("Main St");
  });
});

describe("mapAppleColor", () => {
  it("returns stable palette colors", () => {
    expect(mapAppleColor(0)).toMatch(/^#[0-9A-F]{6}$/i);
    expect(mapAppleColor(0)).not.toBe(mapAppleColor(1));
  });
});
