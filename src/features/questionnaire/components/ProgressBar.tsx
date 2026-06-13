"use client";

export function ProgressBar({
  current,
  total,
  blockLabel,
}: {
  current: number;
  total: number;
  blockLabel: string;
}) {
  const pct = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;
  return (
    <div className="w-full">
      <div className="mb-1.5 flex items-center justify-between text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <span>{blockLabel}</span>
        <span>
          {Math.min(current, total)}/{total}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-secondary/10">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
