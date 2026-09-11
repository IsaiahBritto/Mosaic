import { describe, expect, it } from "vitest";
import {
  buildDefaultSidebarOrder,
  buildSidebarItems,
  groupsToDefaultSidebarOrder,
  mergeSidebarOrder,
  reorderConnectionChildIds,
  reorderSidebarOrderItems,
} from "@/lib/calendar/sidebar-order";
import { groupCalendars } from "@/lib/services/calendar.service";
import type { Calendar } from "@/types/calendar";
import type { CalendarConnection } from "@/lib/integrations/types";

const baseCalendar = (overrides: Partial<Calendar>): Calendar => ({
  id: "cal-1",
  name: "Personal",
  colorHex: "#9379E0",
  type: "native",
  source: "native",
  ownerId: "user-1",
  isVisible: true,
  role: "owner",
  ...overrides,
});

const googleConnection: CalendarConnection = {
  id: "conn-google",
  userId: "user-1",
  provider: "google",
  providerAccountId: "google-sub",
  providerAccountEmail: "user@gmail.com",
  displayName: "BonBritto",
  lastSyncAt: null,
  lastSyncStatus: "ok",
  lastSyncError: null,
};

describe("sidebar order", () => {
  it("default order matches groupCalendars flattening", () => {
    const calendars = [
      baseCalendar({ id: "n1", name: "Personal" }),
      baseCalendar({ id: "n2", name: "Work" }),
      baseCalendar({
        id: "g1",
        source: "google",
        name: "Google Work",
        connectionId: "conn-google",
      }),
      baseCalendar({
        id: "s1",
        type: "shared",
        role: "editor",
        ownerId: "user-2",
        name: "Dance",
      }),
    ];

    const groups = groupCalendars(calendars, [googleConnection]);
    const fromGroups = groupsToDefaultSidebarOrder(groups);
    const fromBuilder = buildDefaultSidebarOrder(calendars, [googleConnection]);

    expect(fromGroups).toEqual(fromBuilder);
    expect(fromBuilder.items.map((item) => item.type)).toEqual([
      "calendar",
      "calendar",
      "connection",
      "calendar",
    ]);
  });

  it("preserves interleaved saved order", () => {
    const calendars = [
      baseCalendar({ id: "n1", name: "Personal" }),
      baseCalendar({
        id: "g1",
        source: "google",
        connectionId: "conn-google",
      }),
      baseCalendar({
        id: "s1",
        type: "shared",
        role: "editor",
        ownerId: "user-2",
      }),
    ];

    const saved = mergeSidebarOrder(calendars, [googleConnection], {
      items: [
        { type: "calendar", calendarId: "s1" },
        { type: "connection", connectionId: "conn-google", calendarIds: ["g1"] },
        { type: "calendar", calendarId: "n1" },
      ],
    });

    expect(saved.items.map((item) =>
      item.type === "calendar" ? item.calendarId : item.connectionId,
    )).toEqual(["s1", "conn-google", "n1"]);
  });

  it("drops stale calendar ids and appends new calendars", () => {
    const calendars = [
      baseCalendar({ id: "n1" }),
      baseCalendar({ id: "n2", name: "Work" }),
    ];

    const saved = mergeSidebarOrder(calendars, [], {
      items: [
        { type: "calendar", calendarId: "missing" },
        { type: "calendar", calendarId: "n1" },
      ],
    });

    expect(saved.items).toEqual([
      { type: "calendar", calendarId: "n1" },
      { type: "calendar", calendarId: "n2" },
    ]);
  });

  it("appends new sub-calendars to a saved connection group", () => {
    const calendars = [
      baseCalendar({
        id: "g1",
        source: "google",
        connectionId: "conn-google",
      }),
      baseCalendar({
        id: "g2",
        source: "google",
        connectionId: "conn-google",
        name: "New import",
      }),
    ];

    const saved = mergeSidebarOrder(calendars, [googleConnection], {
      items: [
        {
          type: "connection",
          connectionId: "conn-google",
          calendarIds: ["g1"],
        },
      ],
    });

    const connectionNode = saved.items[0];
    expect(connectionNode?.type).toBe("connection");
    if (connectionNode?.type === "connection") {
      expect(connectionNode.calendarIds).toEqual(["g1", "g2"]);
    }
  });

  it("builds sidebar items with connection metadata", () => {
    const calendars = [
      baseCalendar({
        id: "g1",
        source: "google",
        connectionId: "conn-google",
      }),
    ];

    const items = buildSidebarItems(calendars, [googleConnection], null);
    expect(items).toHaveLength(1);
    expect(items[0]?.kind).toBe("connection");
    if (items[0]?.kind === "connection") {
      expect(items[0].title).toBe("BonBritto");
      expect(items[0].calendars).toHaveLength(1);
    }
  });

  it("reorders top-level and nested items", () => {
    const order = {
      items: [
        { type: "calendar" as const, calendarId: "n1" },
        {
          type: "connection" as const,
          connectionId: "conn-google",
          calendarIds: ["g1", "g2"],
        },
      ],
    };

    const reorderedTop = reorderSidebarOrderItems(
      order,
      "connection:conn-google",
      "calendar:n1",
    );
    expect(reorderedTop.items[0]?.type).toBe("connection");

    const reorderedNested = reorderConnectionChildIds(
      order,
      "conn-google",
      "g2",
      "g1",
    );
    const connectionNode = reorderedNested.items[1];
    expect(connectionNode?.type).toBe("connection");
    if (connectionNode?.type === "connection") {
      expect(connectionNode.calendarIds).toEqual(["g2", "g1"]);
    }
  });
});
