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
