import { prisma } from "@/lib/db";
import { StandingsTabs } from "@/components/standings/StandingsTabs";
import {
  computeStageResults,
  rankStageResults,
  computeTeamStageRanking,
  computeGeneralClassification,
  computeClimberClassification,
} from "@/lib/standings/calculator";

export const metadata = {
  title: "Classements — TDF 2026",
  description: "Classements du Tour de France amateur 2026",
};

export default async function StandingsPage() {
  const [stages, teams, riders] = await Promise.all([
    prisma.stage.findMany({
      where: { status: "finished" },
      orderBy: { number: "asc" },
      include: {
        checkpoints: true,
        entries: {
          include: {
            rider: { include: { team: true } },
            timeRecords: { include: { checkpoint: true } },
          },
        },
      },
    }),
    prisma.team.findMany(),
    prisma.rider.findMany({ include: { team: true } }),
  ]);

  // Build lookup maps
  const teamMap = new Map(teams.map((t) => [t.id, t]));
  const riderMap = new Map(riders.map((r) => [r.id, r]));

  // Compute stage results
  const stageResultsMap = new Map<number, ReturnType<typeof rankStageResults>>();
  const allColRecords: Array<{
    riderId: string;
    teamId: string;
    checkpointId: string;
    timestamp: number;
  }> = [];

  for (const stage of stages) {
    const records = stage.entries.flatMap((entry) =>
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
    stageResultsMap.set(stage.number, ranked);

    // Col records for climber classification
    for (const entry of stage.entries) {
      for (const tr of entry.timeRecords) {
        if (tr.checkpoint.type === "col") {
          allColRecords.push({
            riderId: entry.rider.id,
            teamId: entry.rider.teamId,
            checkpointId: tr.checkpoint.id,
            timestamp: tr.timestamp.getTime(),
          });
        }
      }
    }
  }

  // Team standings (aggregate)
  const teamStandingsRaw = stages.length > 0
    ? computeTeamStageRanking(
        Array.from(stageResultsMap.values()).flat().map((r) => ({
          riderId: r.riderId,
          teamId: r.teamId,
          elapsedMs: r.elapsedMs,
        })),
        3
      )
    : [];

  const teamStandings = teamStandingsRaw.map((t) => {
    const team = teamMap.get(t.teamId);
    return {
      rank: t.rank,
      teamName: team?.name ?? "Inconnu",
      teamColor: team?.color ?? "#999",
      elapsedMs: t.elapsedMs,
      gapMs: t.gapMs,
    };
  });

  // Individual GC
  const gcEntries = computeGeneralClassification(stageResultsMap, stages.length, "all");
  const individualStandings = gcEntries.map((e) => {
    const rider = riderMap.get(e.riderId);
    return {
      rank: e.rank,
      riderId: e.riderId,
      riderName: rider?.firstName ?? "Inconnu",
      riderSlug: rider?.slug ?? "",
      teamName: rider?.team.name ?? "",
      teamColor: rider?.team.color ?? "#999",
      elapsedMs: e.totalMs,
      gapMs: e.gapMs,
      stagesCompleted: e.stagesCompleted,
    };
  });

  // Lanterne (reversed individual)
  const lanterneStandings = [...individualStandings]
    .reverse()
    .map((s, i) => ({ ...s, rank: i + 1 }));

  // Climber
  const climberEntries = computeClimberClassification(allColRecords);
  const climberStandings = climberEntries.map((e) => {
    const rider = riderMap.get(e.riderId);
    return {
      rank: e.rank,
      riderId: e.riderId,
      riderName: rider?.firstName ?? "Inconnu",
      riderSlug: rider?.slug ?? "",
      teamName: rider?.team.name ?? "",
      teamColor: rider?.team.color ?? "#999",
      points: e.points,
    };
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-2 font-display text-4xl uppercase text-secondary md:text-5xl">
        Classements
      </h1>
      <p className="mb-8 text-muted-foreground">
        {stages.length > 0
          ? `Après ${stages.length} étape${stages.length > 1 ? "s" : ""}`
          : "Les classements apparaîtront après la première étape"}
      </p>

      <StandingsTabs
        teamStandings={teamStandings}
        individualStandings={individualStandings}
        climberStandings={climberStandings}
        lanterneStandings={lanterneStandings}
      />
    </div>
  );
}
