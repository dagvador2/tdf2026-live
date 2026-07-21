"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Bandeau de classement pour OBS (Browser Source 1920×1080).
 * Fond transparent, style incrustation TV Tour de France.
 * Poll l'API classement toutes les 6 secondes.
 */

const POLL_INTERVAL_MS = 6_000;
const ROW_HEIGHT_PX = 52;
const FLASH_DURATION_MS = 1_800;

// Palette broadcast — doit rendre à l'identique quel que soit le thème,
// donc indépendante des variables CSS du site.
const COLORS = {
  yellow: "#F2C200",
  navy: "#1B1F3B",
  cream: "#FAF8F0",
  green: "#22C55E",
  gray: "#9CA3AF",
};

type OverlayStatus = "FINISHED" | "RACING" | "NOT_STARTED" | "DNF" | "DNS";

interface RankingRow {
  rank: number | null;
  name: string;
  teamColor: string | null;
  time: string | null;
  gap: string | null;
  status: OverlayStatus;
}

interface ClassementResponse {
  stage: { id: string; name: string; number: number };
  mode: "team" | "individual";
  rankings: RankingRow[];
  updatedAt: string;
}

const STATUS_LABELS: Record<OverlayStatus, string> = {
  FINISHED: "ARRIVÉ",
  RACING: "EN COURSE",
  NOT_STARTED: "PAS PARTI",
  DNF: "ABANDON",
  DNS: "NON PARTANT",
};

interface OverlayClassementProps {
  mode: "team" | "individual";
  stage: number;
  accessKey: string;
  limit: number;
}

export function OverlayClassement({
  mode,
  stage,
  accessKey,
  limit,
}: OverlayClassementProps) {
  const [data, setData] = useState<ClassementResponse | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);
  const [flashing, setFlashing] = useState<Set<string>>(new Set());
  const [rotationTick, setRotationTick] = useState(0);
  const prevTimesRef = useRef<Map<string, string | null>>(new Map());

  // Fond transparent forcé (le layout global met bg-background sur le body)
  useEffect(() => {
    document.documentElement.style.background = "transparent";
    document.body.style.background = "transparent";
    return () => {
      document.documentElement.style.background = "";
      document.body.style.background = "";
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch(
          `/api/live/classement?mode=${mode}&stage=${stage}&key=${encodeURIComponent(accessKey)}`,
          { cache: "no-store" }
        );
        if (res.status === 401) {
          if (!cancelled) setUnauthorized(true);
          return;
        }
        if (!res.ok) return;
        const json: ClassementResponse = await res.json();
        if (cancelled) return;

        // Détecte les temps qui changent pour déclencher le flash jaune
        const changed = new Set<string>();
        for (const row of json.rankings) {
          const prev = prevTimesRef.current.get(row.name);
          if (prev !== undefined && prev !== row.time && row.time !== null) {
            changed.add(row.name);
          }
          prevTimesRef.current.set(row.name, row.time);
        }
        if (changed.size > 0) {
          setFlashing(changed);
          setTimeout(() => setFlashing(new Set()), FLASH_DURATION_MS);
        }

        setData(json);
        setUnauthorized(false);
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
  }, [mode, stage, accessKey]);

  // Tick du défilement des coureurs en course (15 s)
  useEffect(() => {
    const rotationInterval = setInterval(
      () => setRotationTick((t) => t + 1),
      15_000
    );
    return () => clearInterval(rotationInterval);
  }, []);

  if (unauthorized) {
    return (
      <div className="p-8 font-mono text-sm" style={{ color: COLORS.gray }}>
        Clé d&apos;accès invalide — vérifier le paramètre ?key= de l&apos;URL.
      </div>
    );
  }

  if (!data) return null;

  // Leader (premier arrivé) toujours affiché, puis coureurs en course qui défilent
  const leader = data.rankings.find((r) => r.status === "FINISHED");
  const racing = data.rankings.filter((r) => r.status === "RACING");

  // Défilement : change le groupe de coureurs en course toutes les 15 s
  const rotationIndex = rotationTick % Math.max(1, racing.length);
  const racingWindow = racing.slice(rotationIndex, rotationIndex + (limit - 1));

  const rows = [
    ...(leader ? [leader] : []),
    ...racingWindow,
  ];
  const title =
    mode === "team" ? "CLASSEMENT PAR ÉQUIPE" : "CLM INDIVIDUEL — CLASSEMENT";

  return (
    <div className="fixed bottom-12 left-12" style={{ width: 620 }}>
      {/* Barre de titre */}
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
          <span className="font-display text-2xl tracking-wider">{title}</span>
          <span
            className="font-display text-lg tracking-wide"
            style={{ color: COLORS.yellow }}
          >
            ÉTAPE {data.stage.number}
          </span>
        </div>
      </div>

      {/* Lignes du classement — positionnées en absolu pour animer les
          changements de place par translation */}
      <div
        className="relative overflow-hidden shadow-lg"
        style={{ height: rows.length * ROW_HEIGHT_PX }}
      >
        {rows.map((row, index) => {
          const isFlashing = flashing.has(row.name);
          return (
            <div
              key={row.name}
              className="absolute left-0 right-0 flex items-center transition-transform duration-700 ease-in-out"
              style={{
                height: ROW_HEIGHT_PX,
                transform: `translateY(${index * ROW_HEIGHT_PX}px)`,
                background: isFlashing
                  ? COLORS.yellow
                  : index % 2 === 0
                    ? "rgba(27, 31, 59, 0.92)"
                    : "rgba(27, 31, 59, 0.84)",
                color: isFlashing ? COLORS.navy : COLORS.cream,
                transitionProperty: "transform, background, color",
              }}
            >
              {/* Rang — tiret tant que la ligne n'est pas classée (pas arrivée) */}
              <div
                className="flex h-full w-12 shrink-0 items-center justify-center font-display text-2xl"
                style={{
                  color: isFlashing
                    ? COLORS.navy
                    : row.rank !== null
                      ? COLORS.yellow
                      : COLORS.gray,
                }}
              >
                {row.rank ?? "–"}
              </div>

              {/* Liseré couleur équipe */}
              <div
                className="h-8 w-1.5 shrink-0 rounded-sm"
                style={{ background: row.teamColor ?? COLORS.gray }}
              />

              {/* Nom */}
              <div className="min-w-0 flex-1 truncate px-3 font-display text-xl uppercase tracking-wide">
                {row.name}
              </div>

              {/* Temps + écart, ou statut */}
              <div className="flex shrink-0 items-center gap-3 pr-4">
                {row.time ? (
                  <>
                    <span className="font-mono text-lg font-semibold tabular-nums">
                      {row.time}
                    </span>
                    <span
                      className="w-16 text-right font-mono text-sm tabular-nums"
                      style={{
                        color: isFlashing ? COLORS.navy : COLORS.yellow,
                      }}
                    >
                      {row.gap ?? ""}
                    </span>
                  </>
                ) : (
                  <StatusBadge status={row.status} flashing={isFlashing} />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatusBadge({
  status,
  flashing,
}: {
  status: OverlayStatus;
  flashing: boolean;
}) {
  const color =
    status === "RACING"
      ? COLORS.yellow
      : status === "FINISHED"
        ? COLORS.green
        : COLORS.gray;

  return (
    <span
      className="flex items-center gap-2 font-display text-base tracking-wider"
      style={{ color: flashing ? COLORS.navy : color }}
    >
      {status === "RACING" && (
        <span
          className="h-2.5 w-2.5 animate-pulse rounded-full"
          style={{ background: flashing ? COLORS.navy : COLORS.yellow }}
        />
      )}
      {STATUS_LABELS[status]}
    </span>
  );
}
