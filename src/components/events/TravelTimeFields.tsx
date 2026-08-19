type TravelTimeFieldsProps = {
  beforeMinutes: number;
  afterMinutes: number;
  onBeforeChange: (minutes: number) => void;
  onAfterChange: (minutes: number) => void;
};

function minutesToFields(total: number): { hours: number; minutes: number } {
  return {
    hours: Math.floor(total / 60),
    minutes: total % 60,
  };
}

function fieldsToMinutes(hours: number, minutes: number): number {
  return Math.min(480, Math.max(0, hours * 60 + minutes));
}

function DurationInput({
  label,
  totalMinutes,
  onChange,
}: {
  label: string;
  totalMinutes: number;
  onChange: (minutes: number) => void;
}) {
  const { hours, minutes } = minutesToFields(totalMinutes);

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs uppercase tracking-wide text-text-secondary">
        {label}
      </span>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={0}
          max={8}
          value={hours}
          onChange={(e) =>
            onChange(fieldsToMinutes(Number(e.target.value) || 0, minutes))
          }
          className="w-14 rounded-lg bg-surface px-2 py-2 text-sm text-text-primary outline-none ring-1 ring-transparent focus:ring-accent/50"
          aria-label={`${label} hours`}
        />
        <span className="text-xs text-text-secondary">h</span>
        <input
          type="number"
          min={0}
          max={59}
          step={15}
          value={minutes}
          onChange={(e) =>
            onChange(fieldsToMinutes(hours, Number(e.target.value) || 0))
          }
          className="w-14 rounded-lg bg-surface px-2 py-2 text-sm text-text-primary outline-none ring-1 ring-transparent focus:ring-accent/50"
          aria-label={`${label} minutes`}
        />
        <span className="text-xs text-text-secondary">m</span>
      </div>
    </div>
  );
}

export function TravelTimeFields({
  beforeMinutes,
  afterMinutes,
  onBeforeChange,
  onAfterChange,
}: TravelTimeFieldsProps) {
  return (
    <div className="flex flex-col gap-3">
      <span className="text-xs uppercase tracking-wide text-accent">
        Travel Time
      </span>
      <DurationInput
        label="Before"
        totalMinutes={beforeMinutes}
        onChange={onBeforeChange}
      />
      <DurationInput
        label="After"
        totalMinutes={afterMinutes}
        onChange={onAfterChange}
      />
    </div>
  );
}
