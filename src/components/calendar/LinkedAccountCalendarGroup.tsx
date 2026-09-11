"use client";

import Link from "next/link";
import { Checkbox } from "@/components/ui/Checkbox";
import { CollapseChevron } from "@/components/ui/CollapseChevron";
import { THEME } from "@/lib/theme/colors";
import { cn } from "@/lib/utils/cn";

type LinkedAccountCalendarGroupProps = {
  accountEmail: string;
  connectionId?: string;
  syncStatus?: "ok" | "error" | "syncing" | null;
  syncError?: string | null;
  headerChecked: boolean;
  onHeaderToggle: (checked: boolean) => void;
  onManageCalendars?: () => void;
  onEditHeader?: () => void;
  collapsible?: boolean;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  compact?: boolean;
  children: React.ReactNode;
};

export function LinkedAccountCalendarGroup({
  accountEmail,
  connectionId,
  syncStatus,
  syncError,
  headerChecked,
  onHeaderToggle,
  onManageCalendars,
  onEditHeader,
  collapsible = false,
  collapsed = false,
  onToggleCollapse,
  compact = false,
  children,
}: LinkedAccountCalendarGroupProps) {
  const needsReconnect = syncError === "token_revoked";
  const reconnectHref =
    connectionId != null
      ? `/api/integrations/google/connect?connectionId=${encodeURIComponent(connectionId)}`
      : undefined;

  return (
    <div className="flex flex-col gap-1">
      <div
        className={cn(
          "flex items-center gap-3",
          compact ? "py-1.5" : "rounded-lg bg-surface/40 px-2 py-2",
        )}
      >
        <Checkbox
          checked={headerChecked}
          onChange={onHeaderToggle}
          color={THEME.accent}
        />
        <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-1.5">
            {onEditHeader ? (
              <button
                type="button"
                onClick={onEditHeader}
                className={cn(
                  "truncate text-left text-text-primary hover:underline",
                  compact ? "text-sm" : "text-sm uppercase tracking-wide",
                )}
              >
                {accountEmail}
              </button>
            ) : (
              <span
                className={cn(
                  "truncate text-text-primary",
                  compact ? "text-sm" : "text-sm uppercase tracking-wide",
                )}
              >
                {accountEmail}
              </span>
            )}
            {collapsible && onToggleCollapse ? (
              <button
                type="button"
                onClick={onToggleCollapse}
                className="shrink-0 p-0.5"
                aria-expanded={!collapsed}
                aria-label={collapsed ? "Expand calendars" : "Collapse calendars"}
              >
                <CollapseChevron collapsed={collapsed} />
              </button>
            ) : null}
          </span>
          <div className="flex shrink-0 items-center gap-2">
            {reconnectHref ? (
              <Link
                href={reconnectHref}
                className={cn(
                  "text-[10px] uppercase hover:underline",
                  needsReconnect ? "text-red-400" : "text-text-secondary",
                )}
              >
                Reconnect
              </Link>
            ) : null}
            {onManageCalendars ? (
              <button
                type="button"
                onClick={onManageCalendars}
                className="text-[10px] uppercase text-text-secondary hover:underline"
              >
                Manage
              </button>
            ) : null}
            {syncStatus === "error" && !needsReconnect ? (
              <span className="text-[10px] uppercase text-red-400">Sync error</span>
            ) : null}
          </div>
        </div>
      </div>
      <div
        className={cn(
          "pl-4 transition-all duration-200 ease-out",
          collapsed ? "max-h-0 overflow-hidden opacity-0" : "opacity-100",
        )}
      >
        <div className="flex flex-col gap-1">{children}</div>
      </div>
    </div>
  );
}
