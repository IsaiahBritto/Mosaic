export function StatusLegend() {
  const items = [
    { color: "bg-status-free", label: "You Are Free" },
    { color: "bg-status-busy", label: "You Have Plans" },
    {
      color: "bg-gradient-to-r from-status-busy to-status-free",
      label: "You Made Partial Plans",
    },
    { color: "bg-status-holiday", label: "Holiday" },
  ] as const;

  return (
    <div className="grid grid-cols-2 gap-2 px-4 py-3 text-[10px] uppercase tracking-wide text-text-secondary">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-2">
          <span className={cnDot(item.color)} />
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

function cnDot(color: string) {
  return `h-2.5 w-2.5 shrink-0 rounded-full ${color}`;
}
