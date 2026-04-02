import { verifyRiderJWT } from "@/lib/auth/jwt";
import { prisma } from "@/lib/db";
import { StandingsTabs } from "@/components/standings/StandingsTabs";
import {
  computeStageResults,
  rankStageResults,
  computeTeamStageRanking,
  computeGeneralClassification,
  computeClimberClassification,
} from "@/lib/standings/calculator";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function RiderStandingsPage({
  params,
}: {
  params: { token: string };
}) {
  const result = await verifyRiderJWT(params.token);

  if ("error" in result) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-lg text-destructive">
          {result.error === "expired" ? "Lien expiré" : "Lien invalide"}
        </p>
      </main>
    );
  }

  const rider = await prisma.rider.findUnique({
    where: { id: result.riderId },
    include: { team: true },
  });

  if (!rider) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-lg text-destructive">Coureur introuvable</p>
      </main>
    );
  }

  // Same logic as /classements/page.tsx
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

  const teamMap = new Map(teams.map((t) => [t.id, t]));
  const riderMap = new Map(riders.map((r) => [r.id, r]));

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

  const teamStandingsRaw =
    stages.length > 0
      ? computeTeamStageRanking(
          Array.from(stageResultsMap.values())
            .flat()
            .map((r) => ({
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
      teamId: t.teamId,
      teamName: team?.name ?? "Inconnu",
      teamColor: team?.color ?? "#999",
      elapsedMs: t.elapsedMs,
      gapMs: t.gapMs,
    };
  });

  const gcEntries = computeGeneralClassification(
    stageResultsMap,
    stages.length,
    "all"
  );
  const individualStandings = gcEntries.map((e) => {
    const r = riderMap.get(e.riderId);
    return {
      rank: e.rank,
      riderId: e.riderId,
      riderName: r?.firstName ?? "Inconnu",
      riderSlug: r?.slug ?? "",
      teamName: r?.team.name ?? "",
      teamColor: r?.team.color ?? "#999",
      elapsedMs: e.totalMs,
      gapMs: e.gapMs,
      stagesCompleted: e.stagesCompleted,
    };
  });

  const lanterneStandings = [...individualStandings]
    .reverse()
    .map((s, i) => ({ ...s, rank: i + 1 }));

  const climberEntries = computeClimberClassification(allColRecords);
  const climberStandings = climberEntries.map((e) => {
    const r = riderMap.get(e.riderId);
    return {
      rank: e.rank,
      riderId: e.riderId,
      riderName: r?.firstName ?? "Inconnu",
      riderSlug: r?.slug ?? "",
      teamName: r?.team.name ?? "",
      teamColor: r?.team.color ?? "#999",
      points: e.points,
    };
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link
        href={`/coureur/${params.token}`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour
      </Link>

      <h1 className="mb-1 font-display text-4xl uppercase text-secondary">
        Mes classements
      </h1>
      <p className="mb-6 text-muted-foreground">
        {rider.firstName} —{" "}
        <span style={{ color: rider.team.color }} className="font-semibold">
          {rider.team.name}
        </span>
      </p>

      {stages.length === 0 ? (
        <p className="text-muted-foreground">
          Les classements apparaîtront après la première étape terminée.
        </p>
      ) : (
        <StandingsTabs
          teamStandings={teamStandings}
          individualStandings={individualStandings}
          climberStandings={climberStandings}
          lanterneStandings={lanterneStandings}
          highlightRiderId={rider.id}
          highlightTeamId={rider.teamId}
        />
      )}
    </div>
  );
}
