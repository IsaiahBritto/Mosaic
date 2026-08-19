type PlaceholderViewProps = {
  title: string;
  description?: string;
};

export function PlaceholderView({ title, description }: PlaceholderViewProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <h2 className="text-lg font-bold uppercase tracking-wide text-text-primary">
        {title}
      </h2>
      <p className="mt-2 max-w-xs text-sm text-text-secondary">
        {description ?? "Coming in a future phase."}
      </p>
    </div>
  );
}
