export default function MonthLoading() {
  return (
    <div className="flex flex-1 flex-col gap-3 px-2 py-4 animate-pulse">
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 42 }).map((_, index) => (
          <div key={index} className="h-12 rounded-md bg-surface/60" />
        ))}
      </div>
    </div>
  );
}
