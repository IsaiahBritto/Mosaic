import { Fragment, isValidElement } from "react";
import { describe, expect, it } from "vitest";
import {
  composeShellBlocks,
  getShellBlockOrder,
  splitShellBlocks,
  type ShellBlockKey,
} from "./layout-order";

function getComposedBlockKeys(
  layout: Parameters<typeof composeShellBlocks>[0],
  blocks: Parameters<typeof composeShellBlocks>[1],
): ShellBlockKey[] {
  return composeShellBlocks(layout, blocks)
    .map((node) => (isValidElement(node) ? node.key : null))
    .filter((key): key is ShellBlockKey => typeof key === "string");
}

function getSplitBlockKeys(
  layout: Parameters<typeof splitShellBlocks>[0],
  blocks: Parameters<typeof splitShellBlocks>[1],
): { pinned: ShellBlockKey[]; scrollable: ShellBlockKey[] } {
  const { pinned, scrollable } = splitShellBlocks(layout, blocks);
  const toKeys = (nodes: ReturnType<typeof splitShellBlocks>["pinned"]) =>
    nodes
      .map((node) => (isValidElement(node) ? node.key : null))
      .filter((key): key is ShellBlockKey => typeof key === "string");

  return { pinned: toKeys(pinned), scrollable: toKeys(scrollable) };
}

describe("getShellBlockOrder", () => {
  it("returns nav_first order", () => {
    expect(getShellBlockOrder("nav_first")).toEqual([
      "tabs",
      "period",
      "calendar",
      "calendars",
      "events",
    ]);
  });

  it("returns calendar_before_period order", () => {
    expect(getShellBlockOrder("calendar_before_period")).toEqual([
      "tabs",
      "calendar",
      "period",
      "calendars",
      "events",
    ]);
  });

  it("returns calendar_first order", () => {
    expect(getShellBlockOrder("calendar_first")).toEqual([
      "calendar",
      "tabs",
      "period",
      "calendars",
      "events",
    ]);
  });
});

describe("composeShellBlocks", () => {
  const blocks = {
    tabs: "tabs-node",
    period: "period-node",
    calendar: "calendar-node",
    calendars: "calendars-node",
    events: "events-node",
  };

  it("composes blocks in nav_first order", () => {
    expect(getComposedBlockKeys("nav_first", blocks)).toEqual([
      "tabs",
      "period",
      "calendar",
      "calendars",
      "events",
    ]);
  });

  it("composes blocks in calendar_before_period order", () => {
    expect(getComposedBlockKeys("calendar_before_period", blocks)).toEqual([
      "tabs",
      "calendar",
      "period",
      "calendars",
      "events",
    ]);
  });

  it("composes blocks in calendar_first order", () => {
    expect(getComposedBlockKeys("calendar_first", blocks)).toEqual([
      "calendar",
      "tabs",
      "period",
      "calendars",
      "events",
    ]);
  });

  it("omits null blocks", () => {
    expect(
      getComposedBlockKeys("nav_first", {
        ...blocks,
        calendar: null,
        events: null,
      }),
    ).toEqual(["tabs", "period", "calendars"]);
  });
});

describe("splitShellBlocks", () => {
  const blocks = {
    tabs: "tabs-node",
    period: "period-node",
    calendar: "calendar-node",
    calendars: "calendars-node",
    events: "events-node",
  };

  it("splits nav_first into pinned and scrollable zones", () => {
    expect(getSplitBlockKeys("nav_first", blocks)).toEqual({
      pinned: ["tabs", "period", "calendar"],
      scrollable: ["calendars", "events"],
    });
  });

  it("splits calendar_before_period with calendar in pinned zone", () => {
    expect(getSplitBlockKeys("calendar_before_period", blocks)).toEqual({
      pinned: ["tabs", "calendar", "period"],
      scrollable: ["calendars", "events"],
    });
  });

  it("splits calendar_first with calendar first in pinned zone", () => {
    expect(getSplitBlockKeys("calendar_first", blocks)).toEqual({
      pinned: ["calendar", "tabs", "period"],
      scrollable: ["calendars", "events"],
    });
  });

  it("omits null blocks from each zone", () => {
    expect(
      getSplitBlockKeys("nav_first", {
        ...blocks,
        calendar: null,
        events: null,
      }),
    ).toEqual({
      pinned: ["tabs", "period"],
      scrollable: ["calendars"],
    });
  });
});
