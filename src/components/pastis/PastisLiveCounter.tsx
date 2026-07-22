"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

interface PastisEventPayload {
  riderName: string;
  teamName: string;
  teamColor: string;
  photoUrl: string | null;
  delta: number;
  total: number;
}

/**
 * Compteur global de pastis affiché sur la home, mis à jour en direct via SSE.
 * Quand un coureur se sert, un petit flash annonce qui c'était.
 */
export function PastisLiveCounter({ initialTotal }: { initialTotal: number }) {
  const [total, setTotal] = useState(initialTotal);
  const [flash, setFlash] = useState<{
    name: string;
    color: string;
    photoUrl: string | null;
  } | null>(null);
  const [pop, setPop] = useState(false);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const es = new EventSource("/api/pastis/stream");

    const onConnected = (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data) as { total: number };
        setTotal(data.total);
      } catch {
        /* ignore */
      }
    };

    const onPastis = (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data) as PastisEventPayload;
        setTotal(data.total);
        setPop(true);
        setTimeout(() => setPop(false), 400);
        // Le flash n'a de sens que pour un ajout (undo = delta négatif)
        if (data.delta > 0) {
          setFlash({
            name: data.riderName,
            color: data.teamColor,
            photoUrl: data.photoUrl,
          });
          if (flashTimer.current) clearTimeout(flashTimer.current);
          flashTimer.current = setTimeout(() => setFlash(null), 4000);
        }
      } catch {
        /* ignore */
      }
    };

    es.addEventListener("connected", onConnected);
    es.addEventListener("pastis", onPastis);

    return () => {
      es.close();
      if (flashTimer.current) clearTimeout(flashTimer.current);
    };
  }, []);

  return (
    <Link
      href="/classements"
      className="relative flex items-center gap-4 rounded-xl border border-primary/40 bg-primary/10 px-6 py-4 transition-colors hover:bg-primary/20"
    >
      <span className="text-4xl">🥃</span>
      <div>
        <div
          className={`font-display text-4xl leading-none text-secondary transition-transform dark:text-primary ${
            pop ? "scale-125" : "scale-100"
          }`}
        >
          {total}
        </div>
        <div className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
          pastis descendus par le peloton
        </div>
      </div>

      {flash && (
        <div className="absolute -top-3 right-4 flex items-center gap-1.5 rounded-full border bg-background py-1 pl-1 pr-3 text-xs shadow-md">
          {flash.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={flash.photoUrl}
              alt=""
              className="h-6 w-6 rounded-full object-cover"
            />
          ) : (
            <span
              className="ml-1 h-2 w-2 rounded-full"
              style={{ backgroundColor: flash.color }}
            />
          )}
          <span className="font-medium">{flash.name}</span>
          <span className="text-muted-foreground">se sert un coup&nbsp;!</span>
        </div>
      )}
    </Link>
  );
}
