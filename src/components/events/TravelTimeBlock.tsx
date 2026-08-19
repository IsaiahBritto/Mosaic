type TravelTimeBlockProps = {
  minutes: number;
  label?: string;
};

export function TravelTimeBlock({
  minutes,
  label = "Travel Time",
}: TravelTimeBlockProps) {
  if (minutes <= 0) {
    return null;
  }

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const duration =
    hours > 0 ? `${hours}h ${mins > 0 ? `${mins}m` : ""}`.trim() : `${mins}m`;

  return (
    <div className="flex overflow-hidden rounded-lg bg-surface/80">
      <div className="w-1 shrink-0 bg-travel-time" />
      <div className="flex flex-1 items-center justify-between px-3 py-2 text-xs italic text-text-secondary">
        <span>{label}</span>
        <span>{duration}</span>
      </div>
    </div>
  );
}
