/**
 * Recalcule les classements exactement comme la page /classements, depuis la
 * base, et les imprime. Lecture seule. Sert à valider les imports.
 */
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
import {
  computeStageResults,
  rankStageResults,
  applyTeamTTTime,
  computeStageK,
  computeTeamClassification,
  computeGeneralClassification,
  rerankGC,
  type TeamGCStage,
} from "../src/lib/standings/calculator";

const envPath = path.resolve(__dirname, "../.env.local");
if (fs.existsSync(envPath)) {
  for (const l of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const t = l.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    if (!process.env[t.slice(0, i)])
      process.env[t.slice(0, i)] = t.slice(i + 1).replace(/^["']|["']$/g, "");
  }
}

const fmt = (ms: number) => {
  const t = Math.round(ms / 1000);
  return (
    Math.floor(t / 3600) +
    ":" +
    String(Math.floor((t % 3600) / 60)).padStart(2, "0") +
    ":" +
    String(t % 60).padStart(2, "0")
  );
};
const gap = (ms: number) => (ms <= 0 ? "—" : "+" + fmt(ms));

async function main() {
  const prisma = new PrismaClient();
  const stages = await prisma.stage.findMany({
    where: { status: "finished", number: { gte: 1 } },
    orderBy: { number: "asc" },
    include: {
      entries: {
        include: {
          rider: { include: { team: true } },
          timeRecords: { include: { checkpoint: true } },
        },
      },
    },
  });
  const riders = await prisma.rider.findMany({ include: { team: true } });
  const riderMap = new Map(riders.map((r) => [r.id, r]));

  const stageResultsMap = new Map<number, ReturnType<typeof rankStageResults>>();
  const teamGCStages: TeamGCStage[] = [];

  for (const stage of stages) {
    const entries = stage.entries.filter(
      (e) => e.rider.team.slug !== "sans-equipe"
    );
    const presentByTeam = new Map<string, number>();
    for (const e of entries) {
      if (e.status === "dns") continue;
      presentByTeam.set(e.rider.teamId, (presentByTeam.get(e.rider.teamId) ?? 0) + 1);
    }
    const presenceK = computeStageK(presentByTeam);
    const teamK =
      stage.type === "team_tt" ? presenceK : Math.min(stage.teamTopN, presenceK);

    const records = entries.flatMap((e) =>
      e.timeRecords.map((tr) => ({
        riderId: e.rider.id,
        teamId: e.rider.teamId,
        checkpointType: tr.checkpoint.type,
        timestamp: tr.timestamp.getTime(),
        entryStatus: e.status,
      }))
    );
    const results = computeStageResults(records);
    teamGCStages.push({ type: stage.type, k: teamK, results });

    const indiv =
      stage.type === "team_tt" && presenceK > 0
        ? applyTeamTTTime(results, presenceK)
        : results;
    stageResultsMap.set(stage.number, rankStageResults(indiv));
    console.log(`É${stage.number} (${stage.type}) : présence K=${presenceK}, teamTopN retenu=${teamK}`);
  }

  const name = (id: string) => riderMap.get(id)?.firstName ?? "?";
  const team = (id: string) => riderMap.get(id)?.team.name ?? "?";

  // Classement du jour de la DERNIÈRE étape (individuel)
  const last = stages[stages.length - 1];
  console.log(`\n=== CLASSEMENT DU JOUR — É${last.number} (individuel) ===`);
  const dayRanked = stageResultsMap.get(last.number)!;
  dayRanked.forEach((r) =>
    console.log(
      `${String(r.rank).padStart(2)}. ${name(r.riderId).padEnd(24)} ${fmt(r.elapsedMs)}  ${gap(r.gapMs)}  [${team(r.riderId)}]`
    )
  );

  // Équipe du jour (É dernière) : recalcul isolé
  const lastStageOnly = teamGCStages.slice(-1);
  console.log(`\n=== ÉQUIPE DU JOUR — É${last.number} ===`);
  computeTeamClassification(lastStageOnly).forEach((t) =>
    console.log(`${t.rank}. ${(riderMap.get([...riderMap.keys()].find((id) => riderMap.get(id)!.teamId === t.teamId)!) ? "" : "")}${teamName(t.teamId)} ${fmt(t.totalMs)} ${gap(t.gapMs)}`)
  );

  function teamName(teamId: string) {
    const r = riders.find((r) => r.teamId === teamId);
    return (r?.team.name ?? teamId).padEnd(24);
  }

  // Général équipe (cumul)
  console.log(`\n=== GÉNÉRAL ÉQUIPE (après ${stages.length} étapes) ===`);
  computeTeamClassification(teamGCStages).forEach((t) =>
    console.log(`${t.rank}. ${teamName(t.teamId)} ${fmt(t.totalMs)} ${gap(t.gapMs)}  (${t.stagesCounted} ét.)`)
  );

  // Général individuel — complete_only, séparé H/F
  const gc = computeGeneralClassification(stageResultsMap, stages.length, "complete_only");
  const men = rerankGC(gc.filter((e) => riderMap.get(e.riderId)?.gender !== "f"));
  const women = rerankGC(gc.filter((e) => riderMap.get(e.riderId)?.gender === "f"));

  const printGC = (title: string, list: typeof gc) => {
    console.log(`\n=== GÉNÉRAL INDIVIDUEL — ${title} (${list.length}) ===`);
    list.forEach((e) =>
      console.log(
        `${String(e.rank).padStart(2)}. ${name(e.riderId).padEnd(24)} ${fmt(e.totalMs)}  ${gap(e.gapMs)}  [${team(e.riderId)}] (${e.stagesCompleted} ét.)`
      )
    );
  };
  printGC("HOMMES", men);
  printGC("FEMMES", women);

  const excluded = riders.filter((r) => {
    const inGC = gc.some((e) => e.riderId === r.id);
    const raced = stages.some((s) => s.entries.some((e) => e.riderId === r.id && e.status !== "dns"));
    return raced && !inGC && r.team.slug !== "sans-equipe";
  });
  if (excluded.length)
    console.log(
      `\nℹ️  Hors général individuel (n'ont pas fait toutes les étapes) : ${excluded.map((r) => r.firstName).join(", ")}`
    );

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
