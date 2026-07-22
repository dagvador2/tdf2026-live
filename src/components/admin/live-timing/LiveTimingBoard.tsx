"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { StageControls } from "@/components/admin/stages/StageControls";

/**
 * Tableau de chronométrage live : boutons Départ / Arrivée par équipe
 * (CLM équipe) ou par coureur (CLM individuel et autres étapes).
 * Se resynchronise toutes les 5 secondes pour rester cohérent si
 * plusieurs chronométreurs travaillent en parallèle.
 */

const REFRESH_INTERVAL_MS = 5_000;

interface StageOption {
  id: string;
  number: number;
  name: string;
  type: string;
  status: string;
}

type StampSource = "manual" | "gps" | null;

interface TimingEntry {
  entryId: string;
  status: string;
  rider: { id: string; firstName: string; nickname: string | null };
  team: { id: string; name: string; color: string; slug: string };
  startTime: string | null;
  finishTime: string | null;
  startSource: StampSource;
  finishSource: StampSource;
  intermediates: Record<string, { time: string; source: "manual" | "gps" }>;
}

interface IntermediateCheckpoint {
  id: string;
  name: string;
  kmFromStart: number;
}

interface TimingData {
  stage: StageOption;
  hasStartCheckpoint: boolean;
  hasFinishCheckpoint: boolean;
  intermediateCheckpoints: IntermediateCheckpoint[];
  entries: TimingEntry[];
}

interface InterButton {
  id: string;
  label: string;
  stampedClock: string | null;
  source: StampSource;
  onStamp: () => void;
  onClear: () => void;
}

function formatClock(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("fr-FR");
}

function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}

export function LiveTimingBoard({
  stages,
  initialStageId,
}: {
  stages: StageOption[];
  initialStageId: string;
}) {
  const [stageId, setStageId] = useState(initialStageId);
  const [data, setData] = useState<TimingData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Tick pour faire tourner les chronos "en course" à l'écran
  const [, setTick] = useState(0);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/live-timing?stageId=${stageId}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error();
      setData(await res.json());
      setError(null);
    } catch {
      setError("Impossible de charger les données de chronométrage.");
    }
  }, [stageId]);

  useEffect(() => {
    setData(null);
    fetchData();
    const interval = setInterval(fetchData, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  async function post(
    payload: Record<string, unknown>,
    confirmMessage?: string
  ) {
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/live-timing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stageId, ...payload }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? "Erreur lors de l'enregistrement.");
        return;
      }
      setError(null);
      await fetchData();
    } finally {
      setBusy(false);
    }
  }

  function stamp(
    entryIds: string[],
    checkpointType: "start" | "finish",
    action: "stamp" | "clear",
    confirmMessage?: string
  ) {
    return post({ entryIds, checkpointType, action }, confirmMessage);
  }

  function stampInter(
    entryIds: string[],
    checkpointId: string,
    action: "stamp" | "clear",
    confirmMessage?: string
  ) {
    return post({ entryIds, checkpointId, action }, confirmMessage);
  }

  // Construit les boutons intermédiaires d'une ligne (équipe ou coureur)
  function buildInterButtons(
    entries: TimingEntry[],
    label: string
  ): InterButton[] {
    if (!data) return [];
    const entryIds = entries.map((e) => e.entryId);
    return data.intermediateCheckpoints.map((cp, idx) => {
      // Passage de la ligne = tampon le plus tôt parmi ses coureurs
      let stampedIso: string | null = null;
      let source: StampSource = null;
      for (const e of entries) {
        const s = e.intermediates[cp.id];
        if (s && (stampedIso === null || s.time < stampedIso)) {
          stampedIso = s.time;
          source = s.source;
        }
      }
      return {
        id: cp.id,
        label: `Inter ${idx + 1}`,
        stampedClock: stampedIso ? formatClock(stampedIso) : null,
        source,
        onStamp: () =>
          stampInter(
            entryIds,
            cp.id,
            "stamp",
            stampedIso
              ? `Écraser ${`Inter ${idx + 1}`} déjà enregistré pour ${label} ?`
              : undefined
          ),
        onClear: () =>
          stampInter(
            entryIds,
            cp.id,
            "clear",
            `Supprimer ${`Inter ${idx + 1}`} de ${label} ?`
          ),
      };
    });
  }

  const isTeamTT = data?.stage.type === "team_tt";
  const isTimeTrial =
    data?.stage.type === "team_tt" || data?.stage.type === "individual_tt";

  // Regroupe les entries par équipe pour le CLM équipe
  const teamGroups = useMemo(() => {
    if (!data) return [];
    const groups = new Map<
      string,
      { team: TimingEntry["team"]; entries: TimingEntry[] }
    >();
    for (const entry of data.entries) {
      if (entry.team.slug === "sans-equipe") continue;
      if (!groups.has(entry.team.id)) {
        groups.set(entry.team.id, { team: entry.team, entries: [] });
      }
      groups.get(entry.team.id)!.entries.push(entry);
    }
    return Array.from(groups.values()).sort((a, b) =>
      a.team.name.localeCompare(b.team.name, "fr")
    );
  }, [data]);

  const sortedEntries = useMemo(() => {
    if (!data) return [];
    return [...data.entries].sort((a, b) => {
      if (a.team.name !== b.team.name)
        return a.team.name.localeCompare(b.team.name, "fr");
      return a.rider.firstName.localeCompare(b.rider.firstName, "fr");
    });
  }, [data]);

  return (
    <div className="space-y-6">
      {/* Sélecteur d'étape */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium">Étape :</label>
        <select
          value={stageId}
          onChange={(e) => setStageId(e.target.value)}
          className="rounded border border-border bg-background px-3 py-2 text-sm"
        >
          {stages.map((s) => (
            <option key={s.id} value={s.id}>
              Étape {s.number} — {s.name}
              {s.status === "live" ? " (LIVE)" : ""}
            </option>
          ))}
        </select>
        {data && (
          <span className="text-sm text-muted-foreground">
            {isTeamTT ? "CLM par équipe" : "Chrono par coureur"} ·{" "}
            {data.entries.length} inscrits
          </span>
        )}
      </div>

      {error && (
        <p className="rounded-md bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {/* Contrôle d'étape (même composant que dans l'onglet Étapes) :
          tout se pilote depuis cette page pendant un CLM */}
      {data && (
        <div className="space-y-1">
          <StageControls
            stageId={data.stage.id}
            status={data.stage.status}
            stageName={`Étape ${data.stage.number} — ${data.stage.name}`}
            onStatusChange={fetchData}
          />
          {data.stage.status === "upcoming" && (
            <p className="text-xs text-muted-foreground">
              Astuce : tamponner un premier départ ci-dessous démarre
              automatiquement l&apos;étape.
            </p>
          )}
        </div>
      )}

      {/* Rappel du fonctionnement selon le type d'étape */}
      {data && (
        <p className="rounded-md border border-border bg-muted/50 px-4 py-2 text-sm text-muted-foreground">
          {isTimeTrial ? (
            <>
              <strong className="text-foreground">Étape CLM :</strong> tape les
              départs manuellement au moment où{" "}
              {isTeamTT ? "chaque équipe s'élance" : "chaque coureur s'élance"}.
              Les arrivées sont détectées automatiquement par GPS (badge vert)
              — n&apos;utilise le bouton Arrivée qu&apos;en secours ou pour
              corriger.
            </>
          ) : (
            <>
              <strong className="text-foreground">Étape classique :</strong>{" "}
              départs et arrivées sont détectés automatiquement par GPS (badge
              vert). Cette page sert de secours si le téléphone d&apos;un
              coureur ne remonte pas sa position.
            </>
          )}
        </p>
      )}

      {!data && !error && (
        <p className="py-8 text-center text-muted-foreground">Chargement...</p>
      )}

      {data && !data.hasStartCheckpoint && (
        <p className="rounded-md bg-yellow-100 px-4 py-2 text-sm text-yellow-800">
          Cette étape n&apos;a pas de checkpoint de départ — impossible de
          chronométrer.
        </p>
      )}

      {data && data.entries.length === 0 && (
        <p className="py-8 text-center text-muted-foreground">
          Aucun coureur inscrit sur cette étape.
        </p>
      )}

      {/* CLM équipe : une carte par équipe */}
      {data && isTeamTT && (
        <div className="grid gap-4 md:grid-cols-2">
          {teamGroups.map(({ team, entries }) => {
            const entryIds = entries.map((e) => e.entryId);
            // Repère commun de l'équipe : premier départ / dernière arrivée tamponnés
            const startEntry = entries.find((e) => e.startTime) ?? null;
            const startIso = startEntry?.startTime ?? null;
            const finishIso =
              entries.every((e) => e.finishTime) && entries.length > 0
                ? entries[0].finishTime
                : null;
            return (
              <TimingCard
                key={team.id}
                title={team.name}
                subtitle={`${entries.length} coureurs`}
                color={team.color}
                startIso={startIso}
                finishIso={finishIso}
                startSource={startEntry?.startSource ?? null}
                finishSource={finishIso ? entries[0].finishSource : null}
                intermediates={buildInterButtons(entries, team.name)}
                busy={busy}
                onStart={() =>
                  stamp(
                    entryIds,
                    "start",
                    "stamp",
                    startIso
                      ? `Écraser le départ déjà enregistré pour ${team.name} ?`
                      : undefined
                  )
                }
                onFinish={() =>
                  stamp(
                    entryIds,
                    "finish",
                    "stamp",
                    finishIso
                      ? `Écraser l'arrivée déjà enregistrée pour ${team.name} ?`
                      : undefined
                  )
                }
                onClearStart={() =>
                  stamp(
                    entryIds,
                    "start",
                    "clear",
                    `Supprimer le départ de ${team.name} ?`
                  )
                }
                onClearFinish={() =>
                  stamp(
                    entryIds,
                    "finish",
                    "clear",
                    `Supprimer l'arrivée de ${team.name} ?`
                  )
                }
              />
            );
          })}
        </div>
      )}

      {/* CLM individuel (et autres étapes) : une ligne par coureur */}
      {data && !isTeamTT && (
        <div className="grid gap-3 md:grid-cols-2">
          {sortedEntries.map((entry) => (
            <TimingCard
              key={entry.entryId}
              title={
                entry.rider.nickname
                  ? `${entry.rider.firstName} « ${entry.rider.nickname} »`
                  : entry.rider.firstName
              }
              subtitle={entry.team.name}
              color={entry.team.color}
              startIso={entry.startTime}
              finishIso={entry.finishTime}
              startSource={entry.startSource}
              finishSource={entry.finishSource}
              intermediates={buildInterButtons([entry], entry.rider.firstName)}
              busy={busy}
              onStart={() =>
                stamp(
                  [entry.entryId],
                  "start",
                  "stamp",
                  entry.startTime
                    ? `Écraser le départ de ${entry.rider.firstName} ?`
                    : undefined
                )
              }
              onFinish={() =>
                stamp(
                  [entry.entryId],
                  "finish",
                  "stamp",
                  entry.finishTime
                    ? `Écraser l'arrivée de ${entry.rider.firstName} ?`
                    : undefined
                )
              }
              onClearStart={() =>
                stamp(
                  [entry.entryId],
                  "start",
                  "clear",
                  `Supprimer le départ de ${entry.rider.firstName} ?`
                )
              }
              onClearFinish={() =>
                stamp(
                  [entry.entryId],
                  "finish",
                  "clear",
                  `Supprimer l'arrivée de ${entry.rider.firstName} ?`
                )
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SourceBadge({ source }: { source: StampSource }) {
  if (!source) return null;
  return (
    <span
      className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
        source === "gps"
          ? "bg-green-100 text-green-800"
          : "bg-yellow-100 text-yellow-800"
      }`}
    >
      {source === "gps" ? "GPS" : "Manuel"}
    </span>
  );
}

function TimingCard({
  title,
  subtitle,
  color,
  startIso,
  finishIso,
  startSource,
  finishSource,
  intermediates,
  busy,
  onStart,
  onFinish,
  onClearStart,
  onClearFinish,
}: {
  title: string;
  subtitle: string;
  color: string;
  startIso: string | null;
  finishIso: string | null;
  startSource: StampSource;
  finishSource: StampSource;
  intermediates?: InterButton[];
  busy: boolean;
  onStart: () => void;
  onFinish: () => void;
  onClearStart: () => void;
  onClearFinish: () => void;
}) {
  const started = startIso !== null;
  const finished = finishIso !== null;

  let elapsedLabel: string | null = null;
  if (started) {
    const end = finished ? new Date(finishIso!).getTime() : Date.now();
    const elapsed = end - new Date(startIso!).getTime();
    if (elapsed >= 0) elapsedLabel = formatElapsed(elapsed);
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <span
          className="h-4 w-1.5 shrink-0 rounded-sm"
          style={{ backgroundColor: color }}
        />
        <div className="min-w-0">
          <p className="truncate font-medium">{title}</p>
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        </div>
        {elapsedLabel && (
          <span
            className={`ml-auto font-mono text-lg tabular-nums ${
              finished ? "text-green-600" : "text-primary"
            }`}
          >
            {elapsedLabel}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <button
            onClick={onStart}
            disabled={busy}
            className={`w-full rounded px-3 py-2 text-sm font-semibold transition-colors disabled:opacity-50 ${
              started
                ? "bg-muted text-muted-foreground hover:bg-muted/80"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/85"
            }`}
          >
            {started ? `Départ ${formatClock(startIso)}` : "Départ"}
          </button>
          {started && (
            <div className="mt-1 flex justify-center">
              <SourceBadge source={startSource} />
            </div>
          )}
          {started && !finished && (
            <button
              onClick={onClearStart}
              disabled={busy}
              className="mt-1 w-full text-xs text-muted-foreground hover:text-destructive"
            >
              Annuler le départ
            </button>
          )}
        </div>

        <div>
          <button
            onClick={onFinish}
            disabled={busy || !started}
            className={`w-full rounded px-3 py-2 text-sm font-semibold transition-colors disabled:opacity-50 ${
              finished
                ? "bg-green-100 text-green-800 hover:bg-green-200"
                : "bg-primary text-primary-foreground hover:bg-primary/85"
            }`}
          >
            {finished ? `Arrivée ${formatClock(finishIso)}` : "Arrivée"}
          </button>
          {finished && (
            <div className="mt-1 flex justify-center">
              <SourceBadge source={finishSource} />
            </div>
          )}
          {finished && (
            <button
              onClick={onClearFinish}
              disabled={busy}
              className="mt-1 w-full text-xs text-muted-foreground hover:text-destructive"
            >
              Annuler l&apos;arrivée
            </button>
          )}
        </div>
      </div>

      {intermediates && intermediates.length > 0 && (
        <div className="mt-3 border-t border-border pt-3">
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">
            Temps intermédiaires
          </p>
          <div className="grid grid-cols-3 gap-2">
            {intermediates.map((inter) => (
              <div key={inter.id}>
                <button
                  onClick={inter.onStamp}
                  disabled={busy || !started}
                  className={`w-full rounded px-2 py-1.5 text-xs font-semibold transition-colors disabled:opacity-40 ${
                    inter.stampedClock
                      ? "bg-muted text-muted-foreground hover:bg-muted/80"
                      : "bg-secondary/80 text-secondary-foreground hover:bg-secondary"
                  }`}
                >
                  {inter.stampedClock ? `${inter.label} ✓` : inter.label}
                </button>
                {inter.stampedClock && (
                  <>
                    <p className="mt-0.5 text-center font-mono text-[10px] text-muted-foreground">
                      {inter.stampedClock}
                    </p>
                    <div className="flex justify-center">
                      <SourceBadge source={inter.source} />
                    </div>
                    <button
                      onClick={inter.onClear}
                      disabled={busy}
                      className="w-full text-[10px] text-muted-foreground hover:text-destructive"
                    >
                      Annuler
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
