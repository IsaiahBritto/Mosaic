export default function YearLoading() {
  return (
    <div className="grid grid-cols-2 gap-3 px-3 py-4 animate-pulse">
      {Array.from({ length: 12 }).map((_, index) => (
        <div key={index} className="h-28 rounded-lg bg-surface/60" />
      ))}
    </div>
  );
}
