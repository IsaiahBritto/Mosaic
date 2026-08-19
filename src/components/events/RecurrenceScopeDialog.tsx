"use client";

type RecurrenceScopeDialogProps = {
  open: boolean;
  onSelect: (scope: "single" | "series") => void;
  onCancel: () => void;
};

export function RecurrenceScopeDialog({
  open,
  onSelect,
  onCancel,
}: RecurrenceScopeDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4">
      <div
        className="w-full max-w-md rounded-2xl bg-surface p-4 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="recurrence-scope-title"
      >
        <h2
          id="recurrence-scope-title"
          className="mb-2 text-center text-sm font-bold uppercase tracking-wide text-text-primary"
        >
          Apply changes
        </h2>
        <p className="mb-4 text-center text-sm text-text-secondary">
          This is a recurring event. What should be updated?
        </p>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => onSelect("single")}
            className="rounded-full bg-accent/20 py-3 text-sm font-medium text-accent ring-1 ring-accent/30"
          >
            This event only
          </button>
          <button
            type="button"
            onClick={() => onSelect("series")}
            className="rounded-full bg-background py-3 text-sm font-medium text-text-primary ring-1 ring-surface"
          >
            All events in series
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="py-2 text-sm text-text-secondary"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
