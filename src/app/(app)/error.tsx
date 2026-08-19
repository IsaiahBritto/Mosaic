"use client";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <h2 className="text-lg font-semibold text-text-primary">Something went wrong</h2>
      <p className="text-sm text-text-secondary">{error.message}</p>
      <button
        type="button"
        onClick={reset}
        className="rounded-full bg-surface px-4 py-2 text-sm text-accent ring-1 ring-accent/30"
      >
        Try again
      </button>
    </div>
  );
}
