import type { RecurrenceRule } from "@/types/event";
import { DateInput } from "@/components/events/DateInput";
import { cn } from "@/lib/utils/cn";

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"] as const;

type RecurrenceFieldsProps = {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  value: RecurrenceRule | null;
  onChange: (value: RecurrenceRule | null) => void;
  error?: string;
};

const defaultRule = (): RecurrenceRule => ({
  frequency: "weekly",
  intervalCount: 1,
  daysOfWeek: [new Date().getDay()],
  endDate: null,
});

export function RecurrenceFields({
  enabled,
  onEnabledChange,
  value,
  onChange,
  error,
}: RecurrenceFieldsProps) {
  const rule = value ?? defaultRule();

  function update(partial: Partial<RecurrenceRule>) {
    onChange({ ...rule, ...partial });
  }

  function toggleDay(day: number) {
    const days = rule.daysOfWeek.includes(day)
      ? rule.daysOfWeek.filter((d) => d !== day)
      : [...rule.daysOfWeek, day].sort((a, b) => a - b);
    update({ daysOfWeek: days });
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="flex items-center gap-2 text-xs uppercase tracking-wide text-text-secondary">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => {
            const next = e.target.checked;
            onEnabledChange(next);
            if (next && !value) {
              onChange(defaultRule());
            }
            if (!next) {
              onChange(null);
            }
          }}
          className="rounded border-text-secondary/40"
        />
        Repeat
      </label>

      {enabled ? (
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-3">
            <label className="text-xs uppercase tracking-wide text-text-secondary">
              Every #
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={99}
                value={rule.intervalCount}
                onChange={(e) =>
                  update({ intervalCount: Number(e.target.value) || 1 })
                }
                className="w-16 rounded-lg bg-surface px-2 py-2 text-sm text-text-primary outline-none ring-1 ring-transparent focus:ring-accent/50"
              />
              <select
                value={rule.frequency}
                onChange={(e) =>
                  update({
                    frequency: e.target.value as RecurrenceRule["frequency"],
                  })
                }
                className="flex-1 rounded-lg bg-surface px-2 py-2 text-sm text-text-primary outline-none ring-1 ring-transparent focus:ring-accent/50"
              >
                <option value="daily">Day(s)</option>
                <option value="weekly">Week(s)</option>
                <option value="monthly">Month(s)</option>
                <option value="yearly">Year(s)</option>
              </select>
            </div>

            {rule.frequency === "weekly" ? (
              <div className="flex justify-between gap-1">
                {DAY_LABELS.map((label, index) => (
                  <button
                    key={label + index}
                    type="button"
                    onClick={() => toggleDay(index)}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium",
                      rule.daysOfWeek.includes(index)
                        ? "bg-accent text-background"
                        : "bg-surface text-text-secondary ring-1 ring-text-secondary/30",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            ) : null}

            <DateInput
              label="End Date"
              value={rule.endDate ?? ""}
              onChange={(e) =>
                update({ endDate: e.target.value || null })
              }
            />
          </div>
        </div>
      ) : null}

      {error ? <p className="text-xs text-status-busy">{error}</p> : null}
    </div>
  );
}
