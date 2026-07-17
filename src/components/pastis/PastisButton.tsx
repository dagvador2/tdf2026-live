"use client";

import { useCallback, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Undo2 } from "lucide-react";

interface Burst {
  id: number;
  emojis: { dx: number; delay: number }[];
}

/**
 * Bouton d'auto-déclaration de pastis pour le coureur connecté.
 * Incrémente de façon optimiste, envoie au serveur, et lâche une petite
 * pluie de verres qui montent 🥃. Bouton « annuler » pour le dernier.
 */
export function PastisButton({ initialCount }: { initialCount: number }) {
  const [count, setCount] = useState(initialCount);
  const [pending, setPending] = useState(false);
  const [bursts, setBursts] = useState<Burst[]>([]);
  const nextBurstId = useRef(0);

  const spawnBurst = useCallback(() => {
    const id = nextBurstId.current++;
    const emojis = Array.from({ length: 5 }, (_, i) => ({
      dx: (i - 2) * 18 + (Math.random() * 12 - 6),
      delay: Math.random() * 0.15,
    }));
    setBursts((b) => [...b, { id, emojis }]);
    setTimeout(() => setBursts((b) => b.filter((x) => x.id !== id)), 1300);
  }, []);

  const add = useCallback(async () => {
    setPending(true);
    setCount((c) => c + 1); // optimiste
    spawnBurst();
    try {
      const res = await fetch("/api/pastis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const data = (await res.json()) as { riderCount: number };
        setCount(data.riderCount);
      } else {
        setCount((c) => c - 1); // revert
      }
    } catch {
      setCount((c) => c - 1);
    } finally {
      setPending(false);
    }
  }, [spawnBurst]);

  const undo = useCallback(async () => {
    if (count <= 0) return;
    setPending(true);
    setCount((c) => Math.max(0, c - 1)); // optimiste
    try {
      const res = await fetch("/api/pastis", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const data = (await res.json()) as { riderCount: number };
        setCount(data.riderCount);
      } else {
        setCount((c) => c + 1); // revert
      }
    } catch {
      setCount((c) => c + 1);
    } finally {
      setPending(false);
    }
  }, [count]);

  return (
    <Card className="mb-6 overflow-hidden border-primary/40 bg-primary/10">
      <CardContent className="p-6 text-center">
        <p className="mb-1 font-display text-lg uppercase">Compteur de pastis</p>
        <p className="mb-4 text-sm text-muted-foreground">
          {count === 0
            ? "Aucun pastis déclaré… pour l'instant."
            : `Tu as descendu ${count} pastis 🥃`}
        </p>

        <div className="relative mx-auto flex w-fit flex-col items-center">
          {/* Pluie de verres */}
          <div className="pointer-events-none absolute inset-x-0 -top-2 flex justify-center">
            {bursts.map((burst) =>
              burst.emojis.map((e, i) => (
                <span
                  key={`${burst.id}-${i}`}
                  className="pastis-rise absolute text-2xl"
                  style={{
                    // @ts-expect-error CSS custom properties
                    "--dx": `${e.dx}px`,
                    animationDelay: `${e.delay}s`,
                  }}
                >
                  🥃
                </span>
              ))
            )}
          </div>

          <button
            type="button"
            onClick={add}
            disabled={pending}
            className="flex h-24 w-24 flex-col items-center justify-center rounded-full bg-primary text-secondary shadow-lg transition-transform active:scale-90 disabled:opacity-70"
            aria-label="Ajouter un pastis"
          >
            <span className="text-3xl leading-none">🥃</span>
            <span className="mt-1 font-display text-xl leading-none">+1</span>
          </button>
        </div>

        <button
          type="button"
          onClick={undo}
          disabled={pending || count <= 0}
          className="mt-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40"
        >
          <Undo2 className="h-3.5 w-3.5" />
          Annuler le dernier
        </button>
      </CardContent>

      <style>{`
        @keyframes pastis-rise {
          0%   { transform: translate(0, 0) scale(0.6); opacity: 0; }
          20%  { opacity: 1; }
          100% { transform: translate(var(--dx), -80px) scale(1.1); opacity: 0; }
        }
        .pastis-rise { animation: pastis-rise 1.2s ease-out forwards; }
      `}</style>
    </Card>
  );
}
