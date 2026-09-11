import { afterEach, describe, expect, it, vi } from "vitest";
import {
  applyVisibilityToCalendars,
  groupCalendars,
  orderCalendarsForDisplay,
  resolveVisibleIds,
} from "@/lib/services/calendar.service";
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
  displayName: null,
  lastSyncAt: null,
  lastSyncStatus: "ok",
  lastSyncError: null,
};

const appleConnection: CalendarConnection = {
  id: "conn-apple",
  userId: "user-1",
  provider: "apple",
  providerAccountId: "apple-id",
  providerAccountEmail: "user@icloud.com",
  displayName: null,
  lastSyncAt: null,
  lastSyncStatus: "ok",
  lastSyncError: null,
};

describe("groupCalendars", () => {
  it("groups native owned calendars under NATIVE", () => {
    const calendars = [
      baseCalendar({ id: "1", type: "native", role: "owner" }),
      baseCalendar({ id: "2", name: "Dance", type: "native", role: "owner" }),
    ];

    const groups = groupCalendars(calendars);
    const native = groups.find((g) => g.label === "NATIVE");

    expect(native?.calendars).toHaveLength(2);
  });

  it("groups shared and non-owner calendars under SHARED", () => {
    const calendars = [
      baseCalendar({ id: "1", type: "native", role: "owner" }),
      baseCalendar({
        id: "2",
        name: "Both of Us",
        type: "shared",
        role: "editor",
        ownerId: "user-2",
      }),
    ];

    const groups = groupCalendars(calendars);
    const shared = groups.find((g) => g.label === "SHARED");

    expect(shared?.calendars).toHaveLength(1);
    expect(shared?.calendars[0]?.name).toBe("Both of Us");
  });

  it("includes disabled LINKED stub when both integration flags are off", () => {
    const groups = groupCalendars([]);
    const linked = groups.find((g) => g.label === "LINKED");

    expect(linked?.disabled).toBe(true);
    expect(linked?.emptyMessage).toBe("Coming soon");
  });

  it("returns unique labels for every group", () => {
    const groups = groupCalendars([]);
    const labels = groups.map((g) => g.label);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it("groups linked calendars by connection account email", () => {
    const calendars = [
      baseCalendar({
        id: "g1",
        source: "google",
        name: "Google Work",
        connectionId: "conn-google",
      }),
      baseCalendar({
        id: "a1",
        source: "apple",
        name: "iCloud Home",
        connectionId: "conn-apple",
      }),
    ];

    const groups = groupCalendars(calendars, [googleConnection, appleConnection]);
    const googleGroup = groups.find((g) => g.label === "LINKED_GOOGLE");
    const appleGroup = groups.find((g) => g.label === "LINKED_APPLE");

    expect(googleGroup?.accountEmail).toBe("user@gmail.com");
    expect(googleGroup?.providerAccountEmail).toBe("user@gmail.com");
    expect(googleGroup?.calendars).toHaveLength(1);
    expect(appleGroup?.accountEmail).toBe("user@icloud.com");
    expect(appleGroup?.providerAccountEmail).toBe("user@icloud.com");
    expect(appleGroup?.calendars).toHaveLength(1);
  });

  it("uses custom display name for Google linked group header", () => {
    const calendars = [
      baseCalendar({
        id: "g1",
        source: "google",
        name: "Google Work",
        connectionId: "conn-google",
      }),
    ];

    const groups = groupCalendars(calendars, [
      { ...googleConnection, displayName: "Personal Google" },
    ]);
    const googleGroup = groups.find((g) => g.label === "LINKED_GOOGLE");

    expect(googleGroup?.accountEmail).toBe("Personal Google");
    expect(googleGroup?.title).toBe("Personal Google");
    expect(googleGroup?.providerAccountEmail).toBe("user@gmail.com");
    expect(googleGroup?.accountDisplayName).toBe("Personal Google");
  });
});

describe("groupCalendars with both integration flags enabled", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("orders native, linked accounts, and shared in display order", async () => {
    vi.stubEnv("NEXT_PUBLIC_FEATURE_GOOGLE", "true");
    vi.stubEnv("NEXT_PUBLIC_FEATURE_APPLE", "true");
    vi.resetModules();

    const { groupCalendars: groupCalendarsWithFlags, orderCalendarsForDisplay: orderWithFlags } =
      await import("@/lib/services/calendar.service");

    const calendars = [
      baseCalendar({ id: "n1", type: "native", role: "owner", name: "Personal" }),
      baseCalendar({
        id: "g1",
        source: "google",
        name: "Google Work",
        connectionId: "conn-google",
      }),
      baseCalendar({
        id: "a1",
        source: "apple",
        name: "iCloud Home",
        connectionId: "conn-apple",
      }),
      baseCalendar({
        id: "s1",
        type: "shared",
        role: "editor",
        ownerId: "user-2",
        name: "Shared",
      }),
    ];

    const groups = groupCalendarsWithFlags(calendars, [
      googleConnection,
      appleConnection,
    ]);
    expect(groups.map((g) => g.label)).toEqual([
      "NATIVE",
      "LINKED_GOOGLE",
      "LINKED_APPLE",
      "SHARED",
    ]);

    const ordered = orderWithFlags(groups);
    expect(ordered.map((c) => c.id)).toEqual(["n1", "g1", "a1", "s1"]);
  });

  it("omits empty linked and shared groups when flags are enabled", async () => {
    vi.stubEnv("NEXT_PUBLIC_FEATURE_GOOGLE", "true");
    vi.stubEnv("NEXT_PUBLIC_FEATURE_APPLE", "true");
    vi.resetModules();

    const { groupCalendars: groupCalendarsWithFlags } = await import(
      "@/lib/services/calendar.service"
    );
    const groups = groupCalendarsWithFlags([
      baseCalendar({ id: "n1", type: "native", role: "owner" }),
    ]);

    expect(groups.map((g) => g.label)).toEqual(["NATIVE"]);
  });
});

describe("orderCalendarsForDisplay", () => {
  it("flattens non-empty groups in order", () => {
    const groups = groupCalendars([
      baseCalendar({ id: "n1", type: "native", role: "owner" }),
      baseCalendar({ id: "s1", type: "shared", role: "editor", ownerId: "u2" }),
    ]);

    const ordered = orderCalendarsForDisplay(groups);
    expect(ordered.map((c) => c.id)).toEqual(["n1", "s1"]);
  });
});

describe("resolveVisibleIds", () => {
  it("returns empty array when preference array is empty", () => {
    const calendars = [
      baseCalendar({ id: "a" }),
      baseCalendar({ id: "b" }),
    ];

    expect(resolveVisibleIds(calendars, [])).toEqual([]);
  });

  it("filters to stored visible ids", () => {
    const calendars = [
      baseCalendar({ id: "a" }),
      baseCalendar({ id: "b" }),
    ];

    expect(resolveVisibleIds(calendars, ["b"])).toEqual(["b"]);
  });
});

describe("applyVisibilityToCalendars", () => {
  it("marks calendars based on visible id list", () => {
    const calendars = [
      baseCalendar({ id: "a" }),
      baseCalendar({ id: "b" }),
    ];

    const result = applyVisibilityToCalendars(calendars, ["b"]);
    expect(result.find((c) => c.id === "a")?.isVisible).toBe(false);
    expect(result.find((c) => c.id === "b")?.isVisible).toBe(true);
  });

  it("marks all calendars hidden when visible id list is empty", () => {
    const calendars = [
      baseCalendar({ id: "a" }),
      baseCalendar({ id: "b" }),
    ];

    const result = applyVisibilityToCalendars(calendars, []);
    expect(result.every((c) => c.isVisible === false)).toBe(true);
  });
});
