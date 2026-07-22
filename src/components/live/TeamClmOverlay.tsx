"use client";

import { useEffect, useRef, useState } from "react";

const POLL_INTERVAL_MS = 6_000;
const INTERMEDIATE_FLASH_MS = 4_000;

type ClmStatus = "FINISHED" | "RACING" | "NOT_STARTED" | "DNF" | "DNS";

interface ClmIntermediateTime {
  checkpointId: string;
  checkpointName: string;
  checkpointKm: number;
  time: string | null;
  gapToLeader: string | null;
}

interface ClmRankingRow {
  rank: number | null;
  name: string;
  teamColor: string | null;
  time: string | null;
  gap: string | null;
  status: ClmStatus;
  startMs: number | null;
  intermediates: ClmIntermediateTime[];
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

export function TeamClmOverlay({ stageNumber }: { stageNumber: number }) {
  const [data, setData] = useState<ClmClassementResponse | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [flashingIntermediate, setFlashingIntermediate] = useState<Set<string>>(new Set());
  const prevIntermediatesRef = useRef<Map<string, Set<string>>>(new Map());

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch(`/api/live/clm-classement?stage=${stageNumber}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const json: ClmClassementResponse = await res.json();
        if (cancelled) return;

        // Détecte les nouveaux passages de checkpoints intermédiaires
        const nowFlashing = new Set<string>();
        for (const row of json.rankings) {
          const prev = prevIntermediatesRef.current.get(row.name) ?? new Set();
          const current = new Set(
            row.intermediates
              .filter((i) => i.time !== null)
              .map((i) => i.checkpointId)
          );

          for (const cp of current) {
            if (!prev.has(cp)) {
              nowFlashing.add(`${row.name}__${cp}`);
            }
          }
          prevIntermediatesRef.current.set(row.name, current);
        }

        if (nowFlashing.size > 0) {
          setFlashingIntermediate(nowFlashing);
          setTimeout(() => setFlashingIntermediate(new Set()), INTERMEDIATE_FLASH_MS);
        }

        setData(json);
      } catch {
        // Erreur réseau
      }
    }

    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [stageNumber]);

  // Tick du chrono
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(tick);
  }, []);

  if (!data) return null;

  const COLORS = {
    yellow: "#F2C200",
    navy: "#1B1F3B",
    cream: "#FAF8F0",
    gray: "#9CA3AF",
  };

  return (
    <div className="fixed bottom-12 left-12" style={{ width: 800 }}>
      {/* Titre */}
      <div className="flex items-stretch shadow-lg">
        <div
          className="flex items-center px-4 font-display text-2xl tracking-wider"
          style={{ background: COLORS.yellow, color: COLORS.navy }}
        >
          TDF EXPLORER
        </div>
        <div
          className="flex flex-1 items-center justify-between px-4 py-2"
          style={{ background: COLORS.navy, color: COLORS.cream }}
        >
          <span className="font-display text-2xl tracking-wider">CLM ÉQUIPE</span>
          <span className="font-display text-lg tracking-wide" style={{ color: COLORS.yellow }}>
            ÉTAPE {data.stage.number}
          </span>
        </div>
      </div>

      {/* Classement: toujours les 4 équipes */}
      <div className="relative overflow-hidden shadow-lg">
        {data.rankings.map((row, index) => {
          const lastIntermediate = row.intermediates
            .filter((i) => i.time !== null)
            .pop();
          const hasInterFlash = row.intermediates.some((i) =>
            flashingIntermediate.has(`${row.name}__${i.checkpointId}`)
          );

          return (
            <div
              key={row.name}
              className="flex flex-col px-4 py-3 border-b"
              style={{
                background: hasInterFlash
                  ? COLORS.yellow
                  : index % 2 === 0
                    ? "rgba(27, 31, 59, 0.92)"
                    : "rgba(27, 31, 59, 0.84)",
                color: hasInterFlash ? COLORS.navy : COLORS.cream,
                borderColor: hasInterFlash ? COLORS.yellow : "rgba(156, 163, 175, 0.3)",
                transition: "all 200ms",
              }}
            >
              {/* Ligne équipe */}
              <div className="flex items-center gap-3">
                <span
                  className="w-6 text-center font-mono text-sm font-bold"
                  style={{ color: hasInterFlash ? COLORS.navy : COLORS.yellow }}
                >
                  {row.rank ?? "–"}
                </span>

                <span
                  className="h-6 w-1.5 shrink-0 rounded-sm"
                  style={{ background: row.teamColor ?? COLORS.gray }}
                />

                <span className="flex-1 truncate font-display text-lg uppercase tracking-wide">
                  {row.name}
                </span>

                {/* Chrono ou temps */}
                <div className="flex items-center gap-4">
                  {row.status === "FINISHED" && row.time ? (
                    <>
                      <span className="font-mono font-semibold tabular-nums text-sm">
                        {row.time}
                      </span>
                      {row.gap && (
                        <span
                          className="font-mono text-xs tabular-nums w-16 text-right"
                          style={{ color: hasInterFlash ? COLORS.navy : COLORS.yellow }}
                        >
                          {row.gap}
                        </span>
                      )}
                    </>
                  ) : row.status === "RACING" ? (
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 animate-pulse rounded-full"
                        style={{ background: hasInterFlash ? COLORS.navy : COLORS.yellow }}
                      />
                      <span className="font-mono font-semibold tabular-nums text-sm">
                        {row.startMs !== null ? formatElapsed(now - row.startMs) : ""}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs">{STATUS_LABELS[row.status]}</span>
                  )}
                </div>
              </div>

              {/* Intermédiaire en flash */}
              {lastIntermediate && hasInterFlash && (
                <div className="flex items-center gap-2 mt-2 ml-14 text-xs font-semibold">
                  <span>{lastIntermediate.checkpointName}</span>
                  <span className="font-mono">
                    {lastIntermediate.time} @ {lastIntermediate.checkpointKm}km
                  </span>
                  {lastIntermediate.gapToLeader && (
                    <span className="font-mono">{lastIntermediate.gapToLeader}</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
