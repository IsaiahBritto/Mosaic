export default function DayLoading() {
  return (
    <div className="flex flex-1 flex-col gap-3 px-4 py-4 animate-pulse">
      <div className="h-16 rounded-lg bg-surface" />
      <div className="h-16 rounded-lg bg-surface" />
      <div className="flex-1 rounded-lg bg-surface/60" />
    </div>
  );
}
