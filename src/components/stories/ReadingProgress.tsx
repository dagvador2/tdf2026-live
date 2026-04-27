"use client";

import { RotateCcw, Trophy } from "lucide-react";
import { useReadStories } from "@/hooks/useReadStories";

/**
 * Progress card shown in the /histoires hero. Renders nothing until
 * hydrated AND at least one story has been read, to avoid a noisy
 * empty state on first visit.
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
  const done = count === total;

  return (
    <div className="mx-auto mt-7 w-full max-w-sm rounded-2xl border border-white/10 bg-black/25 px-5 py-4 text-left backdrop-blur-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] opacity-70">
            Ta progression
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-display text-4xl leading-none text-primary">{count}</span>
            <span className="text-sm opacity-75">/ {total} lues</span>
          </div>
        </div>
        <button
          onClick={() => {
            if (confirm("Réinitialiser ta progression de lecture ?")) clearAll();
          }}
          className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-white/60 transition-colors hover:bg-white/20 hover:text-white"
          aria-label="Réinitialiser la progression"
          title="Réinitialiser"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-white/15">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary to-amber-300 shadow-[0_0_12px_rgba(242,194,0,0.5)] transition-[width] duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mt-2.5 flex items-center justify-between text-[11px]">
        {done ? (
          <span className="inline-flex items-center gap-1 font-semibold text-primary">
            <Trophy className="h-3.5 w-3.5" />
            Bravo, toutes les histoires sont lues
          </span>
        ) : (
          <span className="opacity-65">{pct}% du chemin parcouru</span>
        )}
        {!done && <span className="font-mono text-[10px] opacity-50">{total - count} restantes</span>}
      </div>
    </div>
  );
}
