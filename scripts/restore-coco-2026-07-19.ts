/**
 * Retour de Coco (19/07/2026) — annule le forfait du 18/07 :
 * 1. Coco → équipe Visma Ricard.
 * 2. Réinscription sur É1 à É6 (elle était prévue sur toutes les étapes,
 *    cf. scripts/tdf-sheet.csv).
 */
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

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

async function main() {
  const prisma = new PrismaClient();

  const visma = await prisma.team.findUnique({
    where: { slug: "visma-ricard" },
  });
  if (!visma) throw new Error("Équipe visma-ricard introuvable");

  const coco = await prisma.rider.findFirst({
    where: { firstName: "Coco" },
    include: { team: { select: { name: true } } },
  });
  if (!coco) throw new Error("Coco introuvable");

  await prisma.rider.update({
    where: { id: coco.id },
    data: { teamId: visma.id },
  });
  console.log(`✅ Coco : ${coco.team.name} → ${visma.name}`);

  const stages = await prisma.stage.findMany({
    where: { number: { in: [1, 2, 3, 4, 5, 6] } },
  });
  if (stages.length !== 6) {
    throw new Error(`Étapes 1-6 incomplètes (${stages.length}/6)`);
  }
  for (const stage of stages.sort((a, b) => a.number - b.number)) {
    const existing = await prisma.stageEntry.findUnique({
      where: { riderId_stageId: { riderId: coco.id, stageId: stage.id } },
    });
    if (existing) {
      console.log(`⚠️  Coco déjà inscrite É${stage.number}`);
      continue;
    }
    await prisma.stageEntry.create({
      data: { riderId: coco.id, stageId: stage.id, status: "registered" },
    });
    console.log(`✅ Coco inscrite É${stage.number}`);
  }

  // Résumé effectifs par étape
  console.log("\n=== Présents par étape (hors sans-equipe, non-DNS) ===");
  const entries = await prisma.stageEntry.findMany({
    where: {
      stage: { number: { gte: 1 } },
      status: { not: "dns" },
      rider: { team: { slug: { not: "sans-equipe" } } },
    },
    include: {
      stage: { select: { number: true } },
      rider: { select: { team: { select: { name: true } } } },
    },
  });
  const byStage = new Map<number, Map<string, number>>();
  for (const e of entries) {
    if (!byStage.has(e.stage.number)) byStage.set(e.stage.number, new Map());
    const m = byStage.get(e.stage.number)!;
    m.set(e.rider.team.name, (m.get(e.rider.team.name) ?? 0) + 1);
  }
  for (const [num, m] of [...byStage.entries()].sort((a, b) => a[0] - b[0])) {
    const counts = [...m.values()];
    const k = Math.min(...counts);
    const parts = [...m.entries()].map(([t, n]) => `${t}: ${n}`).join(" | ");
    console.log(`É${num} → ${parts}  ⇒ K=${k}`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
