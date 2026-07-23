/**
 * Standings calculator — pure functions operating on data structures.
 * No Prisma dependency: the caller fetches data and passes it in.
 */

export interface StageTimeRecord {
  riderId: string;
  teamId: string;
  checkpointType: string; // "start" | "finish" | "col" | "sprint"
  timestamp: number; // Unix ms
  entryStatus: string;
}

export interface StageResult {
  riderId: string;
  teamId: string;
  elapsedMs: number; // finish - start
}

export interface RankedResult {
  riderId: string;
  teamId: string;
  rank: number;
  elapsedMs: number;
  gapMs: number; // gap to rank 1
}

export interface TeamStageResult {
  teamId: string;
  rank: number;
  elapsedMs: number;
  gapMs: number;
}

export interface GCEntry {
  riderId: string;
  teamId: string;
  totalMs: number;
  stagesCompleted: number;
  rank: number;
  gapMs: number;
}

export interface ClimberEntry {
  riderId: string;
  teamId: string;
  points: number;
  rank: number;
}

export interface PastisEvent {
  riderId: string;
  teamId: string;
  quantity: number;
}

export interface PastisIndividualEntry {
  riderId: string;
  teamId: string;
  count: number;
  rank: number;
}

export interface PastisTeamEntry {
  teamId: string;
  count: number;
  rank: number;
}

// ── Stage individual ranking ──────────────────────────

/**
 * Compute individual stage results from time records.
 * Only includes riders who have both start and finish records.
 * Excludes DNF riders.
 */
export function computeStageResults(
  records: StageTimeRecord[]
): StageResult[] {
  const byRider = new Map<
    string,
    { start: number | null; finish: number | null; teamId: string; status: string }
  >();

  for (const r of records) {
    if (!byRider.has(r.riderId)) {
      byRider.set(r.riderId, {
        start: null,
        finish: null,
        teamId: r.teamId,
        status: r.entryStatus,
      });
    }
    const entry = byRider.get(r.riderId)!;
    if (r.checkpointType === "start") entry.start = r.timestamp;
    if (r.checkpointType === "finish") entry.finish = r.timestamp;
  }

  const results: StageResult[] = [];
  for (const [riderId, data] of byRider) {
    if (data.status === "dnf" || data.status === "dns") continue;
    if (data.start === null || data.finish === null) continue;
    results.push({
      riderId,
      teamId: data.teamId,
      elapsedMs: data.finish - data.start,
    });
  }

  return results.sort((a, b) => a.elapsedMs - b.elapsedMs);
}

/**
 * Rank stage results with gap to winner.
 */
export function rankStageResults(results: StageResult[]): RankedResult[] {
  if (results.length === 0) return [];
  const winnerTime = results[0].elapsedMs;

  return results.map((r, i) => ({
    riderId: r.riderId,
    teamId: r.teamId,
    rank: i + 1,
    elapsedMs: r.elapsedMs,
    gapMs: r.elapsedMs - winnerTime,
  }));
}

// ── Team Time Trial ────────────────────────────────

/**
 * For a Team TT, the team time is the Nth rider's time.
 * All riders in the team get the same time.
 */
export function computeTeamTTResults(
  results: StageResult[],
  nthRider: number
): TeamStageResult[] {
  const byTeam = new Map<string, number[]>();

  for (const r of results) {
    if (!byTeam.has(r.teamId)) byTeam.set(r.teamId, []);
    byTeam.get(r.teamId)!.push(r.elapsedMs);
  }

  const teamResults: Array<{ teamId: string; elapsedMs: number }> = [];
  for (const [teamId, times] of byTeam) {
    times.sort((a, b) => a - b);
    const n = Math.min(nthRider, times.length);
    teamResults.push({ teamId, elapsedMs: times[n - 1] });
  }

  teamResults.sort((a, b) => a.elapsedMs - b.elapsedMs);
  const winnerTime = teamResults[0]?.elapsedMs ?? 0;

  return teamResults.map((t, i) => ({
    teamId: t.teamId,
    rank: i + 1,
    elapsedMs: t.elapsedMs,
    gapMs: t.elapsedMs - winnerTime,
  }));
}

/**
 * Team TT rule for INDIVIDUAL times: every rider of a team gets the team's
 * time, i.e. the K-th best time of the team (grouped start, the K-th rider
 * is the last of the group to cross the line). Capped at team size so a
 * short-handed team still gets a time.
 */
export function applyTeamTTTime(
  results: StageResult[],
  k: number
): StageResult[] {
  const byTeam = new Map<string, number[]>();
  for (const r of results) {
    if (!byTeam.has(r.teamId)) byTeam.set(r.teamId, []);
    byTeam.get(r.teamId)!.push(r.elapsedMs);
  }

  const teamTime = new Map<string, number>();
  for (const [teamId, times] of byTeam) {
    times.sort((a, b) => a - b);
    const n = Math.min(k, times.length);
    teamTime.set(teamId, times[n - 1]);
  }

  return results
    .map((r) => ({ ...r, elapsedMs: teamTime.get(r.teamId)! }))
    .sort((a, b) => a.elapsedMs - b.elapsedMs);
}

// ── Team stage ranking (sum of N best) ─────────────

/**
 * Team ranking for a stage: sum of the top N riders' times per team.
 */
export function computeTeamStageRanking(
  results: StageResult[],
  topN: number
): TeamStageResult[] {
  const byTeam = new Map<string, number[]>();

  for (const r of results) {
    if (!byTeam.has(r.teamId)) byTeam.set(r.teamId, []);
    byTeam.get(r.teamId)!.push(r.elapsedMs);
  }

  const teamResults: Array<{ teamId: string; elapsedMs: number }> = [];
  for (const [teamId, times] of byTeam) {
    times.sort((a, b) => a - b);
    const n = Math.min(topN, times.length);
    const sum = times.slice(0, n).reduce((acc, t) => acc + t, 0);
    teamResults.push({ teamId, elapsedMs: sum });
  }

  teamResults.sort((a, b) => a.elapsedMs - b.elapsedMs);
  const winnerTime = teamResults[0]?.elapsedMs ?? 0;

  return teamResults.map((t, i) => ({
    teamId: t.teamId,
    rank: i + 1,
    elapsedMs: t.elapsedMs,
    gapMs: t.elapsedMs - winnerTime,
  }));
}

// ── Team General Classification ────────────────────

export interface TeamGCStage {
  type: string; // StageType: "road" | "team_tt" | "individual_tt" | "mountain"
  /** K du jour : nombre minimum de présents parmi les équipes. */
  k: number;
  /**
   * Mode de calcul du temps d'équipe (hors CLM par équipe qui garde son ×K) :
   * - "sum"  : somme des K meilleurs temps (les « derniers » ne comptent pas)
   * - "mean" : moyenne de TOUS les coureurs × K (tout le monde compte)
   */
  mode?: "sum" | "mean";
  /** Résultats individuels bruts de l'étape (temps réels, pas le temps équipe). */
  results: StageResult[];
}

export interface TeamGCEntry {
  teamId: string;
  totalMs: number;
  stagesCounted: number;
  rank: number;
  gapMs: number;
}

/**
 * Le K du jour : minimum de coureurs présents parmi les équipes alignées.
 * Les équipes sans aucun présent sont ignorées (sinon K=0 annulerait l'étape).
 */
export function computeStageK(presentByTeam: Map<string, number>): number {
  let min = Infinity;
  for (const count of presentByTeam.values()) {
    if (count > 0 && count < min) min = count;
  }
  return min === Infinity ? 0 : min;
}

/**
 * Classement général équipe : temps d'équipe calculé PAR ÉTAPE puis cumulé.
 *
 * - Étapes individuelles / montagne, mode "sum" : somme des K meilleurs temps
 *   de l'équipe (les coureurs au-delà du top-K — « sacrifiés » — ne comptent pas).
 * - Étapes individuelles / montagne, mode "mean" : moyenne de TOUS les coureurs
 *   de l'équipe × K (tout le monde compte, normalisé par l'effectif).
 * - CLM par équipe : temps du K-ième coureur × K, pour peser autant qu'une
 *   étape où K temps sont sommés.
 * - Une équipe avec moins de K arrivants somme ce qu'elle a (pas de crash),
 *   le K dynamique calculé sur les présents rend le cas exceptionnel.
 */
export function computeTeamClassification(
  stages: TeamGCStage[]
): TeamGCEntry[] {
  const totals = new Map<string, { totalMs: number; stagesCounted: number }>();

  for (const stage of stages) {
    if (stage.k <= 0) continue;

    const byTeam = new Map<string, number[]>();
    for (const r of stage.results) {
      if (!byTeam.has(r.teamId)) byTeam.set(r.teamId, []);
      byTeam.get(r.teamId)!.push(r.elapsedMs);
    }

    for (const [teamId, times] of byTeam) {
      times.sort((a, b) => a - b);
      const n = Math.min(stage.k, times.length);
      let stageMs: number;
      if (stage.type === "team_tt") {
        stageMs = times[n - 1] * stage.k;
      } else if (stage.mode === "mean") {
        const mean = times.reduce((acc, t) => acc + t, 0) / times.length;
        stageMs = mean * stage.k;
      } else {
        stageMs = times.slice(0, n).reduce((acc, t) => acc + t, 0);
      }

      if (!totals.has(teamId)) {
        totals.set(teamId, { totalMs: 0, stagesCounted: 0 });
      }
      const entry = totals.get(teamId)!;
      entry.totalMs += stageMs;
      entry.stagesCounted += 1;
    }
  }

  const entries = Array.from(totals.entries())
    .map(([teamId, data]) => ({ teamId, ...data }))
    .sort((a, b) => {
      // Une équipe ayant couru plus d'étapes a forcément plus de temps :
      // on classe d'abord par étapes comptées desc, puis par temps asc.
      if (a.stagesCounted !== b.stagesCounted) {
        return b.stagesCounted - a.stagesCounted;
      }
      return a.totalMs - b.totalMs;
    });

  const winnerTime = entries[0]?.totalMs ?? 0;

  return entries.map((e, i) => ({
    ...e,
    rank: i + 1,
    gapMs: e.totalMs - winnerTime,
  }));
}

// ── General Classification ────────────────────────

/**
 * Compute GC across multiple stages.
 *
 * Modes:
 * - "all": All riders ranked, `stagesCompleted` shown
 * - "complete_only": Only riders with all stages
 * - "categories": Same as "all" (categories handled at display level)
 */
export function computeGeneralClassification(
  stageResults: Map<number, RankedResult[]>,
  totalStages: number,
  mode: "all" | "complete_only" | "categories"
): GCEntry[] {
  const totals = new Map<
    string,
    { teamId: string; totalMs: number; stagesCompleted: number }
  >();

  for (const results of stageResults.values()) {
    for (const r of results) {
      if (!totals.has(r.riderId)) {
        totals.set(r.riderId, {
          teamId: r.teamId,
          totalMs: 0,
          stagesCompleted: 0,
        });
      }
      const entry = totals.get(r.riderId)!;
      entry.totalMs += r.elapsedMs;
      entry.stagesCompleted += 1;
    }
  }

  let entries = Array.from(totals.entries()).map(([riderId, data]) => ({
    riderId,
    ...data,
  }));

  if (mode === "complete_only") {
    entries = entries.filter((e) => e.stagesCompleted === totalStages);
  }

  // Sort: primary by totalMs, secondary by stagesCompleted desc (more stages = better)
  entries.sort((a, b) => {
    if (a.totalMs !== b.totalMs) return a.totalMs - b.totalMs;
    return b.stagesCompleted - a.stagesCompleted;
  });

  const winnerTime = entries[0]?.totalMs ?? 0;

  return entries.map((e, i) => ({
    riderId: e.riderId,
    teamId: e.teamId,
    totalMs: e.totalMs,
    stagesCompleted: e.stagesCompleted,
    rank: i + 1,
    gapMs: e.totalMs - winnerTime,
  }));
}

/**
 * Re-classe un sous-ensemble d'entrées GC (ex : après filtrage Hommes ou
 * Femmes) : rangs 1..n et écarts recalculés sur le premier du sous-ensemble.
 * L'ordre d'entrée est préservé (déjà trié par temps total).
 */
export function rerankGC(entries: GCEntry[]): GCEntry[] {
  const winnerTime = entries[0]?.totalMs ?? 0;
  return entries.map((e, i) => ({
    ...e,
    rank: i + 1,
    gapMs: e.totalMs - winnerTime,
  }));
}

// ── Climber Classification ──────────────────────

const COL_POINTS: Record<number, number[]> = {
  // Based on number of cols in a stage, assign points
  // rank 1 = max points, descending
  1: [10, 8, 6, 5, 4, 3, 2, 1],
};

/**
 * Compute climber points from col checkpoint times.
 * Points awarded per col: 1st = 10, 2nd = 8, 3rd = 6, etc.
 */
export function computeClimberClassification(
  colRecords: Array<{
    riderId: string;
    teamId: string;
    checkpointId: string;
    timestamp: number;
  }>
): ClimberEntry[] {
  const pointScale = COL_POINTS[1];

  // Group by checkpoint
  const byCheckpoint = new Map<
    string,
    Array<{ riderId: string; teamId: string; timestamp: number }>
  >();
  for (const r of colRecords) {
    if (!byCheckpoint.has(r.checkpointId)) {
      byCheckpoint.set(r.checkpointId, []);
    }
    byCheckpoint.get(r.checkpointId)!.push(r);
  }

  const points = new Map<string, { teamId: string; points: number }>();

  for (const records of byCheckpoint.values()) {
    records.sort((a, b) => a.timestamp - b.timestamp);
    for (let i = 0; i < records.length; i++) {
      const r = records[i];
      const pts = i < pointScale.length ? pointScale[i] : 0;
      if (pts === 0) continue;

      if (!points.has(r.riderId)) {
        points.set(r.riderId, { teamId: r.teamId, points: 0 });
      }
      points.get(r.riderId)!.points += pts;
    }
  }

  const entries = Array.from(points.entries())
    .map(([riderId, data]) => ({
      riderId,
      teamId: data.teamId,
      points: data.points,
    }))
    .sort((a, b) => b.points - a.points);

  return entries.map((e, i) => ({
    ...e,
    rank: i + 1,
  }));
}

// ── Classement Pastis (« Maillot Jaune de l'Apéro » 🥃) ─────

/**
 * Classement individuel du pastis : somme des quantités par coureur,
 * du plus gros buveur au plus petit. Les ex-aequo partagent le même rang
 * (competition ranking : 1, 2, 2, 4) — c'est plus juste pour un compteur
 * où les égalités sont fréquentes.
 */
export function computePastisIndividualRanking(
  events: PastisEvent[]
): PastisIndividualEntry[] {
  const byRider = new Map<string, { teamId: string; count: number }>();

  for (const e of events) {
    if (!byRider.has(e.riderId)) {
      byRider.set(e.riderId, { teamId: e.teamId, count: 0 });
    }
    byRider.get(e.riderId)!.count += e.quantity;
  }

  const sorted = Array.from(byRider.entries())
    .map(([riderId, data]) => ({ riderId, teamId: data.teamId, count: data.count }))
    .sort((a, b) => b.count - a.count);

  return rankByCount(sorted);
}

/**
 * Classement des équipes : somme des quantités de tous les coureurs d'une équipe.
 */
export function computePastisTeamRanking(
  events: PastisEvent[]
): PastisTeamEntry[] {
  const byTeam = new Map<string, number>();

  for (const e of events) {
    byTeam.set(e.teamId, (byTeam.get(e.teamId) ?? 0) + e.quantity);
  }

  const sorted = Array.from(byTeam.entries())
    .map(([teamId, count]) => ({ teamId, count }))
    .sort((a, b) => b.count - a.count);

  return rankByCount(sorted);
}

/**
 * Attribue un rang par `count` décroissant avec gestion des ex-aequo
 * (les égalités partagent le rang, le rang suivant saute d'autant).
 */
function rankByCount<T extends { count: number }>(
  sorted: T[]
): Array<T & { rank: number }> {
  let lastCount: number | null = null;
  let lastRank = 0;

  return sorted.map((entry, i) => {
    const rank = entry.count === lastCount ? lastRank : i + 1;
    lastCount = entry.count;
    lastRank = rank;
    return { ...entry, rank };
  });
}
