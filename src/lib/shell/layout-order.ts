import { createElement, Fragment, type ReactNode } from "react";
import type { ShellLayout } from "@/lib/actions/views";

export type ShellBlockKey = "tabs" | "period" | "calendar" | "calendars" | "events";

export type ShellBlocks = Record<ShellBlockKey, ReactNode>;

export const PINNED_SHELL_BLOCKS: ShellBlockKey[] = ["tabs", "period", "calendar"];
export const SCROLL_SHELL_BLOCKS: ShellBlockKey[] = ["calendars", "events"];

const ORDERS: Record<ShellLayout, ShellBlockKey[]> = {
  nav_first: ["tabs", "period", "calendar", "calendars", "events"],
  calendar_before_period: ["tabs", "calendar", "period", "calendars", "events"],
  calendar_first: ["calendar", "tabs", "period", "calendars", "events"],
};

export function getShellBlockOrder(layout: ShellLayout): ShellBlockKey[] {
  return ORDERS[layout];
}

function wrapShellBlocks(
  keys: ShellBlockKey[],
  blocks: ShellBlocks,
): ReactNode[] {
  return keys
    .filter((key) => blocks[key] != null)
    .map((key) => createElement(Fragment, { key }, blocks[key]));
}

export function splitShellBlocks(
  layout: ShellLayout,
  blocks: ShellBlocks,
): { pinned: ReactNode[]; scrollable: ReactNode[] } {
  const order = getShellBlockOrder(layout);
  const pinnedKeys = order.filter((key) => PINNED_SHELL_BLOCKS.includes(key));
  const scrollableKeys = order.filter((key) => SCROLL_SHELL_BLOCKS.includes(key));

  return {
    pinned: wrapShellBlocks(pinnedKeys, blocks),
    scrollable: wrapShellBlocks(scrollableKeys, blocks),
  };
}

export function composeShellBlocks(
  layout: ShellLayout,
  blocks: ShellBlocks,
): ReactNode[] {
  return wrapShellBlocks(getShellBlockOrder(layout), blocks);
}

export const SHELL_LAYOUT_OPTIONS: {
  value: ShellLayout;
  label: string;
  description: string;
}[] = [
  {
    value: "nav_first",
    label: "Navigation first",
    description: "Tabs and period nav above the calendar",
  },
  {
    value: "calendar_before_period",
    label: "Calendar before period",
    description: "Calendar between tabs and period nav",
  },
  {
    value: "calendar_first",
    label: "Calendar first",
    description: "Calendar at the top after Mosaic",
  },
];

export const PREVIEW_BLOCK_LABELS: Record<ShellBlockKey, string> = {
  tabs: "Week · Month · Year",
  period: "Date",
  calendar: "Calendar",
  calendars: "Calendars",
  events: "Events",
};
