import { prisma } from "@/lib/db";
import {
  computeStageResults,
  rankStageResults,
  computeTeamTTResults,
  computeStageK,
  type StageTimeRecord,
} from "@/lib/standings/calculator";

/**
 * Classement provisoire d'un CLM en temps réel, calculé depuis les
 * TimeRecords. Partagé entre l'overlay OBS (/api/live/classement, protégé
 * par clé) et le suivi live public du site (/api/live/clm-classement).
 */

export type ClmStatus = "FINISHED" | "RACING" | "NOT_STARTED" | "DNF" | "DNS";

const STATUS_ORDER: Record<ClmStatus, number> = {
  FINISHED: 0,
  RACING: 1,
  NOT_STARTED: 2,
  DNF: 3,
  DNS: 4,
};

export interface ClmRankingRow {
  rank: number | null;
  name: string;
  teamColor: string | null;
  time: string | null;
  gap: string | null;
  status: ClmStatus;
  /** Timestamp de départ (epoch ms) quand la ligne est en course — permet
   *  d'afficher un chrono qui tourne côté client. */
  startMs: number | null;
}

export interface ClmClassement {
  stage: { id: string; name: string; number: number };
  mode: "team" | "individual";
  rankings: ClmRankingRow[];
  updatedAt: string;
}

function formatElapsed(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}

function formatGap(ms: number): string | null {
  if (ms <= 0) return null;
  return `+${formatElapsed(ms)}`;
}

function riderStatus(
  entryStatus: string,
  hasStart: boolean,
  hasFinish: boolean
): ClmStatus {
  if (entryStatus === "dnf") return "DNF";
  if (entryStatus === "dns") return "DNS";
  if (hasFinish) return "FINISHED";
  if (hasStart || entryStatus === "started" || entryStatus === "tracking") {
    return "RACING";
  }
  return "NOT_STARTED";
}

interface UnrankedRow extends Omit<ClmRankingRow, "rank"> {
  sortMs: number | null;
}

export async function getClmLiveClassement(
  stageNumber: number,
  modeOverride?: "team" | "individual"
): Promise<ClmClassement | null> {
  const stage = await prisma.stage.findUnique({
    where: { number: stageNumber },
    include: {
      entries: {
        include: {
          rider: { include: { team: true } },
          timeRecords: { include: { checkpoint: true } },
        },
      },
    },
  });

  if (!stage) return null;

  const mode =
    modeOverride ?? (stage.type === "team_tt" ? "team" : "individual");

  const entryState = stage.entries.map((entry) => {
    let start: number | null = null;
    let finish: number | null = null;
    for (const tr of entry.timeRecords) {
      if (tr.checkpoint.type === "start") start = tr.timestamp.getTime();
      if (tr.checkpoint.type === "finish") finish = tr.timestamp.getTime();
    }
    return { entry, start, finish };
  });

  const records: StageTimeRecord[] = stage.entries.flatMap((entry) =>
    entry.timeRecords.map((tr) => ({
      riderId: entry.rider.id,
      teamId: entry.rider.teamId,
      checkpointType: tr.checkpoint.type,
      timestamp: tr.timestamp.getTime(),
      entryStatus: entry.status,
    }))
  );

  const results = computeStageResults(records);
  const ranked = rankStageResults(results);

  let rows: UnrankedRow[];

  if (mode === "team") {
    // Règle CLM équipe : le temps de l'équipe est celui du K-ième coureur
    // (départ groupé à K, le K-ième est le dernier du groupe). K = minimum de
    // présents (non-DNS) parmi les équipes alignées ce jour-là.
    const presentByTeam = new Map<string, number>();
    for (const entry of stage.entries) {
      if (entry.rider.team.slug === "sans-equipe") continue;
      if (entry.status === "dns") continue;
      presentByTeam.set(
        entry.rider.teamId,
        (presentByTeam.get(entry.rider.teamId) ?? 0) + 1
      );
    }
    const k = computeStageK(presentByTeam);
    // computeTeamTTResults plafonne le K-ième au nombre de finishers de
    // l'équipe, donc une équipe incomplète garde un temps.
    const teamResults = computeTeamTTResults(
      results,
      k > 0 ? k : Number.MAX_SAFE_INTEGER
    );
    const rankedByTeam = new Map(teamResults.map((t) => [t.teamId, t]));

    const teamsMap = new Map<
      string,
      {
        name: string;
        color: string;
        slug: string;
        finishers: number;
        starters: number;
        active: number;
        firstStartMs: number | null;
      }
    >();

    for (const { entry, start, finish } of entryState) {
      const team = entry.rider.team;
      if (!teamsMap.has(team.id)) {
        teamsMap.set(team.id, {
          name: team.name,
          color: team.color,
          slug: team.slug,
          finishers: 0,
          starters: 0,
          active: 0,
          firstStartMs: null,
        });
      }
      const agg = teamsMap.get(team.id)!;
      const isActive = entry.status !== "dnf" && entry.status !== "dns";
      if (isActive) agg.active += 1;
      if (isActive && finish !== null) agg.finishers += 1;
      if (start !== null || finish !== null) agg.starters += 1;
      if (start !== null) {
        agg.firstStartMs =
          agg.firstStartMs === null ? start : Math.min(agg.firstStartMs, start);
      }
    }

    rows = Array.from(teamsMap.entries())
      .filter(([, t]) => t.slug !== "sans-equipe")
      .map(([teamId, t]) => {
        const result = rankedByTeam.get(teamId);
        // L'équipe est arrivée quand TOUS ses coureurs encore en course ont
        // franchi la ligne (les abandons ne bloquent pas)
        const finished = t.active > 0 && t.finishers >= t.active;
        const status: ClmStatus = finished
          ? "FINISHED"
          : t.starters > 0
            ? "RACING"
            : "NOT_STARTED";

        return {
          name: t.name,
          teamColor: t.color,
          time: finished && result ? formatElapsed(result.elapsedMs) : null,
          gap: finished && result ? formatGap(result.gapMs) : null,
          status,
          sortMs: finished && result ? result.elapsedMs : null,
          startMs: status === "RACING" ? t.firstStartMs : null,
        };
      });
  } else {
    const rankedByRider = new Map(ranked.map((r) => [r.riderId, r]));

    rows = entryState.map(({ entry, start, finish }) => {
      const result = rankedByRider.get(entry.rider.id);
      const status = riderStatus(entry.status, start !== null, finish !== null);
      const name = entry.rider.nickname
        ? `${entry.rider.firstName} "${entry.rider.nickname}"`
        : entry.rider.firstName;

      return {
        name: `${name} (${entry.rider.team.name})`,
        teamColor: entry.rider.team.color,
        time: result ? formatElapsed(result.elapsedMs) : null,
        gap: result ? formatGap(result.gapMs) : null,
        status,
        sortMs: result ? result.elapsedMs : null,
        startMs: status === "RACING" ? start : null,
      };
    });
  }

  rows.sort((a, b) => {
    if (a.status !== b.status) {
      return STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    }
    if (a.status === "FINISHED" && a.sortMs !== null && b.sortMs !== null) {
      return a.sortMs - b.sortMs;
    }
    return a.name.localeCompare(b.name, "fr");
  });

  // Un rang uniquement pour les arrivés — les autres restent non classés
  let nextRank = 1;
  const rankings: ClmRankingRow[] = rows.map((r) => ({
    rank: r.status === "FINISHED" && r.time !== null ? nextRank++ : null,
    name: r.name,
    teamColor: r.teamColor,
    time: r.time,
    gap: r.gap,
    status: r.status,
    startMs: r.startMs,
  }));

  return {
    stage: { id: stage.id, name: stage.name, number: stage.number },
    mode,
    rankings,
    updatedAt: new Date().toISOString(),
  };
}
