type MonthHeaderProps = {
  monthDate: Date;
};

export function MonthHeader({ monthDate }: MonthHeaderProps) {
  const label = monthDate
    .toLocaleString("en-US", { month: "long", year: "numeric" })
    .toUpperCase();

  return (
    <h2 className="px-4 py-3 text-center text-sm font-bold tracking-widest text-text-primary">
      {label}
    </h2>
  );
}
