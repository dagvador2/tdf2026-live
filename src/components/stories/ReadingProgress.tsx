"use client";

import { useReadStories } from "@/hooks/useReadStories";

/**
 * Small progress bar shown in the /histoires hero once the visitor has
 * read at least one story. Renders nothing until hydrated.
 */
export function ReadingProgress({ slugs }: { slugs: string[] }) {
  const { read, hydrated, clearAll } = useReadStories();
  if (!hydrated) return null;

  const total = slugs.length;
  const set = new Set(slugs);
  let count = 0;
  for (const s of read) if (set.has(s)) count++;
  if (count === 0) return null;

  const pct = Math.round((count / total) * 100);

  return (
    <div className="relative mt-6 inline-block min-w-[260px] rounded-full bg-white/10 px-4 py-2 text-left">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="font-semibold uppercase tracking-wider opacity-90">Ta progression</span>
        <button
          onClick={() => {
            if (confirm("Reinitialiser ta progression de lecture ?")) clearAll();
          }}
          className="text-[10px] uppercase tracking-wider opacity-50 hover:opacity-90"
          aria-label="Reinitialiser"
        >
          ↺
        </button>
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="font-display text-2xl text-primary">{count}</span>
        <span className="text-sm opacity-70">/ {total} lues</span>
      </div>
      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/20">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
