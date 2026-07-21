import { prisma } from "@/lib/db";
import { StandingsTabs } from "@/components/standings/StandingsTabs";
import { PageHero } from "@/components/layout/PageHero";
import {
  computeStageResults,
  rankStageResults,
  applyTeamTTTime,
  computeStageK,
  computeTeamClassification,
  computeGeneralClassification,
  computeClimberClassification,
  rerankGC,
  type TeamGCStage,
  type GCEntry,
} from "@/lib/standings/calculator";
import { getPastisData } from "@/lib/pastis/queries";

export const metadata = {
  title: "Classements — TDF 2026",
  description: "Classements du Tour de France amateur 2026",
};

// Results must reflect the DB live during the race, not the last deploy
export const dynamic = "force-dynamic";

export default async function StandingsPage() {
  const [stages, teams, riders, pastis] = await Promise.all([
    prisma.stage.findMany({
      // Stage 0 is the internal test stage — its results must not feed the GC
      where: { status: "finished", number: { gte: 1 } },
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
    getPastisData(),
  ]);

  // Build lookup maps
  const teamMap = new Map(teams.map((t) => [t.id, t]));
  const riderMap = new Map(riders.map((r) => [r.id, r]));

  // Compute stage results
  const stageResultsMap = new Map<number, ReturnType<typeof rankStageResults>>();
  const teamGCStages: TeamGCStage[] = [];
  const allColRecords: Array<{
    riderId: string;
    teamId: string;
    checkpointId: string;
    timestamp: number;
  }> = [];

  for (const stage of stages) {
    // Coureurs « sans équipe » exclus de tous les calculs publics
    const entries = stage.entries.filter(
      (entry) => entry.rider.team.slug !== "sans-equipe"
    );

    // Présence du jour = minimum de présents (non-DNS) parmi les équipes
    const presentByTeam = new Map<string, number>();
    for (const entry of entries) {
      if (entry.status === "dns") continue;
      presentByTeam.set(
        entry.rider.teamId,
        (presentByTeam.get(entry.rider.teamId) ?? 0) + 1
      );
    }
    const presenceK = computeStageK(presentByTeam);

    // Nombre de coureurs comptés dans le TEMPS D'ÉQUIPE : teamTopN (réglable
    // par étape en admin), borné par la présence minimale du jour pour rester
    // équitable (toutes les équipes comptent le même nombre de coureurs).
    // Le CLM par équipe garde son facteur ×présence — teamTopN ne s'y applique
    // pas.
    const teamK =
      stage.type === "team_tt"
        ? presenceK
        : Math.min(stage.teamTopN, presenceK);

    const records = entries.flatMap((entry) =>
      entry.timeRecords.map((tr) => ({
        riderId: entry.rider.id,
        teamId: entry.rider.teamId,
        checkpointType: tr.checkpoint.type,
        timestamp: tr.timestamp.getTime(),
        entryStatus: entry.status,
      }))
    );

    const results = computeStageResults(records);

    // Classement équipe : temps réels par étape (le ×présence du CLM équipe est
    // appliqué dans computeTeamClassification)
    teamGCStages.push({ type: stage.type, k: teamK, results });

    // Classement individuel : sur le CLM par équipe, chaque coureur prend le
    // temps de son équipe (celui du K-ième coureur, départ groupé)
    const individualResults =
      stage.type === "team_tt" && presenceK > 0
        ? applyTeamTTTime(results, presenceK)
        : results;

    const ranked = rankStageResults(individualResults);
    stageResultsMap.set(stage.number, ranked);

    // Col records for climber classification
    for (const entry of entries) {
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

  // Team standings : temps d'équipe calculé par étape (somme des K meilleurs,
  // CLM équipe = K-ième × K) puis cumulé sur les étapes courues
  const teamStandingsRaw = computeTeamClassification(teamGCStages);

  const teamStandings = teamStandingsRaw.map((t) => {
    const team = teamMap.get(t.teamId);
    return {
      rank: t.rank,
      teamName: team?.name ?? "Inconnu",
      teamColor: team?.color ?? "#999",
      elapsedMs: t.totalMs,
      gapMs: t.gapMs,
    };
  });

  // Individual GC — réservé aux coureurs présents à toutes les étapes courues
  // (les partiels sortent automatiquement du général dès qu'ils manquent une
  // étape), séparé Hommes / Femmes
  const gcEntries = computeGeneralClassification(
    stageResultsMap,
    stages.length,
    "complete_only"
  );

  const toDisplay = (entries: GCEntry[]) =>
    entries.map((e) => {
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

  const menStandings = toDisplay(
    rerankGC(gcEntries.filter((e) => riderMap.get(e.riderId)?.gender !== "f"))
  );
  const womenStandings = toDisplay(
    rerankGC(gcEntries.filter((e) => riderMap.get(e.riderId)?.gender === "f"))
  );

  // Lanterne (général H+F confondus, inversé)
  const lanterneStandings = toDisplay(gcEntries)
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
    <>
      <PageHero
        kicker="La course"
        title="Classements"
        subtitle={
          stages.length > 0
            ? `Après ${stages.length} étape${stages.length > 1 ? "s" : ""}`
            : "Les classements apparaîtront après la première étape"
        }
      />
      <div className="mx-auto max-w-4xl px-4 py-8">
        <StandingsTabs
          teamStandings={teamStandings}
          menStandings={menStandings}
          womenStandings={womenStandings}
          climberStandings={climberStandings}
          lanterneStandings={lanterneStandings}
          pastis={pastis}
        />
      </div>
    </>
  );
}
