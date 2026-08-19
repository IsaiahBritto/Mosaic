import { describe, expect, it } from "vitest";
import {
  applyVisibilityToCalendars,
  groupCalendars,
  resolveVisibleIds,
} from "@/lib/services/calendar.service";
import type { Calendar } from "@/types/calendar";

const baseCalendar = (overrides: Partial<Calendar>): Calendar => ({
  id: "cal-1",
  name: "Personal",
  colorHex: "#9379E0",
  type: "native",
  ownerId: "user-1",
  isVisible: true,
  role: "owner",
  ...overrides,
});

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

  it("includes disabled LINKED stub when feature flag is on", () => {
    const groups = groupCalendars([]);
    const linked = groups.find((g) => g.label === "LINKED");

    expect(linked?.disabled).toBe(true);
    expect(linked?.emptyMessage).toBe("Coming soon");
  });
});

describe("resolveVisibleIds", () => {
  it("returns all calendar ids when preference array is empty", () => {
    const calendars = [
      baseCalendar({ id: "a" }),
      baseCalendar({ id: "b" }),
    ];

    expect(resolveVisibleIds(calendars, [])).toEqual(["a", "b"]);
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
});
