export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center px-6 py-12">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold uppercase tracking-[0.2em] text-accent">
          Mosaic
        </h1>
        <p className="mt-1 text-sm text-text-secondary">Your shared calendar</p>
      </div>
      <div className="w-full max-w-sm rounded-2xl bg-surface p-6 ring-1 ring-text-secondary/10">
        {children}
      </div>
    </div>
  );
}
