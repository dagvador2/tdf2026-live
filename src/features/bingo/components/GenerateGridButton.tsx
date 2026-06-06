"use client";

import { useState, useTransition } from "react";
import { generateGridAction } from "@/features/bingo/actions/generate-grid";

export function GenerateGridButton() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const res = await generateGridAction();
            if (!res.ok) setError(res.error);
          });
        }}
        className="rounded-full bg-primary px-6 py-3 font-display text-lg uppercase tracking-wide text-primary-foreground shadow-md transition active:scale-[0.98] disabled:opacity-50"
      >
        {pending ? "Génération..." : "Générer ma grille"}
      </button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
