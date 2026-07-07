import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  computeStageResults,
  rankStageResults,
  computeTeamTTResults,
  type StageTimeRecord,
} from "@/lib/standings/calculator";

export const dynamic = "force-dynamic";

type OverlayStatus = "FINISHED" | "RACING" | "NOT_STARTED" | "DNF" | "DNS";

const STATUS_ORDER: Record<OverlayStatus, number> = {
  FINISHED: 0,
  RACING: 1,
  NOT_STARTED: 2,
  DNF: 3,
  DNS: 4,
};

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
): OverlayStatus {
  if (entryStatus === "dnf") return "DNF";
  if (entryStatus === "dns") return "DNS";
  if (hasFinish) return "FINISHED";
  if (hasStart || entryStatus === "started" || entryStatus === "tracking") {
    return "RACING";
  }
  return "NOT_STARTED";
}

function checkKey(request: Request): boolean {
  const requiredKey = process.env.LIVE_OVERLAY_KEY || "tdf2026live";
  const key = new URL(request.url).searchParams.get("key");
  return key === requiredKey;
}

interface RankingRow {
  rank: number;
  name: string;
  teamColor: string | null;
  time: string | null;
  gap: string | null;
  status: OverlayStatus;
  sortMs: number | null;
}

export async function GET(request: Request) {
  if (!checkKey(request)) {
    return NextResponse.json({ error: "Clé invalide" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const stageNumber = Number(searchParams.get("stage"));

  if (!stageNumber) {
    return NextResponse.json(
      { error: "Paramètre stage requis" },
      { status: 400 }
    );
  }

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

  if (!stage) {
    return NextResponse.json({ error: "Étape introuvable" }, { status: 404 });
  }

  const mode =
    searchParams.get("mode") === "individual" ||
    searchParams.get("mode") === "team"
      ? (searchParams.get("mode") as "individual" | "team")
      : stage.type === "team_tt"
        ? "team"
        : "individual";

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

  let rows: RankingRow[];

  if (mode === "team") {
    const teamResults = computeTeamTTResults(results, stage.ttNthRider);
    const rankedByTeam = new Map(teamResults.map((t) => [t.teamId, t]));

    const teamsMap = new Map<
      string,
      { name: string; color: string; slug: string; finishers: number; starters: number }
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
        });
      }
      const agg = teamsMap.get(team.id)!;
      if (finish !== null) agg.finishers += 1;
      if (start !== null || finish !== null) agg.starters += 1;
    }

    rows = Array.from(teamsMap.entries())
      .filter(([, t]) => t.slug !== "sans-equipe")
      .map(([teamId, t]) => {
        const result = rankedByTeam.get(teamId);
        const finished = t.finishers >= stage.ttNthRider;
        const status: OverlayStatus = finished
          ? "FINISHED"
          : t.starters > 0
            ? "RACING"
            : "NOT_STARTED";

        return {
          rank: 0,
          name: t.name,
          teamColor: t.color,
          time: finished && result ? formatElapsed(result.elapsedMs) : null,
          gap: finished && result ? formatGap(result.gapMs) : null,
          status,
          sortMs: finished && result ? result.elapsedMs : null,
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
        rank: 0,
        name: `${name} (${entry.rider.team.name})`,
        teamColor: entry.rider.team.color,
        time: result ? formatElapsed(result.elapsedMs) : null,
        gap: result ? formatGap(result.gapMs) : null,
        status,
        sortMs: result ? result.elapsedMs : null,
      };
    });
  }

  rows.sort((a, b) => {
    if (a.status !== b.status) return STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    if (a.status === "FINISHED" && a.sortMs !== null && b.sortMs !== null) {
      return a.sortMs - b.sortMs;
    }
    return a.name.localeCompare(b.name, "fr");
  });

  const rankedRows = rows.map((r, i) => ({
    rank: i + 1,
    name: r.name,
    teamColor: r.teamColor,
    time: r.time,
    gap: r.gap,
    status: r.status,
  }));

  return NextResponse.json({
    stage: { id: stage.id, name: stage.name, number: stage.number },
    mode,
    rankings: rankedRows,
    updatedAt: new Date().toISOString(),
  });
}
