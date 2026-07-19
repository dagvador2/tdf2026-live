"use client";

import { useEffect, useState } from "react";

/**
 * Classement provisoire d'un CLM pour la page de suivi live du site.
 * Mêmes règles que le bandeau OBS : rang réservé aux arrivés, chrono qui
 * tourne pour ceux en course, tiret pour les autres.
 */

const POLL_INTERVAL_MS = 10_000;

type ClmStatus = "FINISHED" | "RACING" | "NOT_STARTED" | "DNF" | "DNS";

interface ClmRankingRow {
  rank: number | null;
  name: string;
  teamColor: string | null;
  time: string | null;
  gap: string | null;
  status: ClmStatus;
  startMs: number | null;
}

interface ClmClassementResponse {
  stage: { id: string; name: string; number: number };
  mode: "team" | "individual";
  rankings: ClmRankingRow[];
  updatedAt: string;
}

const STATUS_LABELS: Record<ClmStatus, string> = {
  FINISHED: "Arrivé",
  RACING: "En course",
  NOT_STARTED: "Pas parti",
  DNF: "Abandon",
  DNS: "Non partant",
};

function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}

export function ClmLiveStandings({ stageNumber }: { stageNumber: number }) {
  const [data, setData] = useState<ClmClassementResponse | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch(`/api/live/clm-classement?stage=${stageNumber}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const json: ClmClassementResponse = await res.json();
        if (!cancelled) setData(json);
      } catch {
        // Erreur réseau : on garde le dernier classement affiché
      }
    }

    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [stageNumber]);

  // Tick du chrono des lignes en course
  const hasRacing = data?.rankings.some(
    (r) => r.status === "RACING" && r.startMs !== null
  );
  useEffect(() => {
    if (!hasRacing) return;
    const tick = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(tick);
  }, [hasRacing]);

  if (!data) return null;

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="flex items-center justify-between border-b border-border bg-muted px-4 py-2">
        <h2 className="font-display text-sm uppercase tracking-wide text-secondary">
          Classement provisoire
        </h2>
        <span className="text-xs text-muted-foreground">
          {data.mode === "team" ? "Par équipe" : "Individuel"}
        </span>
      </div>
      <ol>
        {data.rankings.map((row) => (
          <li
            key={row.name}
            className="flex items-center gap-3 border-b border-border px-4 py-2.5 last:border-b-0"
          >
            <span className="w-5 text-center font-mono text-sm font-bold text-muted-foreground">
              {row.rank ?? "–"}
            </span>
            <span
              className="h-6 w-1.5 shrink-0 rounded-sm"
              style={{ backgroundColor: row.teamColor ?? "#9CA3AF" }}
            />
            <span className="flex-1 truncate font-display uppercase text-secondary">
              {row.name}
            </span>
            {row.status === "FINISHED" && row.time ? (
              <>
                <span className="font-mono text-sm font-semibold tabular-nums">
                  {row.time}
                </span>
                <span className="w-14 text-right font-mono text-xs tabular-nums text-muted-foreground">
                  {row.gap ?? ""}
                </span>
              </>
            ) : row.status === "RACING" ? (
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
                <span className="font-mono text-sm font-semibold tabular-nums">
                  {row.startMs !== null
                    ? formatElapsed(now - row.startMs)
                    : STATUS_LABELS.RACING}
                </span>
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">
                {STATUS_LABELS[row.status]}
              </span>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
