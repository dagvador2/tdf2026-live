"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { revealGridAction } from "@/features/bingo/actions/reveal-grid";

export function RevealGridButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-center gap-6 px-6 pt-16 text-center">
      <div className="text-7xl">🎲</div>
      <div className="space-y-2">
        <h2 className="font-display text-3xl uppercase tracking-tight">
          Ta grille de bingo t&apos;attend
        </h2>
        <p className="max-w-xs text-sm text-muted-foreground">
          16 cases rien que pour toi, tirées au sort. Clique pour découvrir la
          tienne.
        </p>
      </div>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const res = await revealGridAction();
            if (res.ok) router.refresh();
            else setError(res.error);
          });
        }}
        className="rounded-full bg-primary px-8 py-4 font-display text-xl uppercase tracking-wide text-primary-foreground shadow-lg transition active:scale-[0.98] disabled:opacity-50"
      >
        {pending ? "Génération…" : "Afficher ma grille"}
      </button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
