/**
 * Mise à jour effectifs + genres avant le départ (18/07/2026) :
 * 1. Coco (blessée, forfait) → « Sans équipe » + suppression de ses
 *    inscriptions (vérifié : aucun timeRecord ni position GPS).
 * 2. Patrick Pham (EAU Pastis XRG) → inscrit sur É4, É5, É6 (2ᵉ partie).
 * 3. gender = 'f' pour les coureuses (défaut 'm' pour le reste).
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

const WOMEN = [
  "ambre",
  "nadege",
  "lucie dupont",
  "gaelle",
  "louise loisel",
  "eve moins",
  "louison timmerman",
  "coco",
];

function normalize(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

async function main() {
  const prisma = new PrismaClient();

  // 1. Coco → sans équipe, inscriptions supprimées
  const sansEquipe = await prisma.team.findUnique({
    where: { slug: "sans-equipe" },
  });
  if (!sansEquipe) throw new Error("Équipe sans-equipe introuvable");

  const coco = await prisma.rider.findFirst({
    where: { firstName: "Coco" },
    include: { entries: { include: { _count: { select: { timeRecords: true, gpsPositions: true } } } } },
  });
  if (!coco) throw new Error("Coco introuvable");

  const hasData = coco.entries.some(
    (e) => e._count.timeRecords > 0 || e._count.gpsPositions > 0
  );
  if (hasData) {
    throw new Error(
      "Coco a des timeRecords/GPS — suppression annulée, à traiter manuellement"
    );
  }
  await prisma.stageEntry.deleteMany({ where: { riderId: coco.id } });
  await prisma.rider.update({
    where: { id: coco.id },
    data: { teamId: sansEquipe.id },
  });
  console.log(
    `✅ Coco → Sans équipe (${coco.entries.length} inscriptions supprimées)`
  );

  // 2. Patrick Pham → É4, É5, É6
  const patrick = await prisma.rider.findFirst({
    where: { firstName: "Patrick Pham" },
  });
  if (!patrick) throw new Error("Patrick Pham introuvable");

  const mountainStages = await prisma.stage.findMany({
    where: { number: { in: [4, 5, 6] } },
  });
  if (mountainStages.length !== 3) {
    throw new Error(`Étapes 4-6 incomplètes (${mountainStages.length}/3)`);
  }
  for (const stage of mountainStages) {
    const existing = await prisma.stageEntry.findUnique({
      where: { riderId_stageId: { riderId: patrick.id, stageId: stage.id } },
    });
    if (existing) {
      console.log(`⚠️  Patrick déjà inscrit É${stage.number}`);
      continue;
    }
    await prisma.stageEntry.create({
      data: { riderId: patrick.id, stageId: stage.id, status: "registered" },
    });
    console.log(`✅ Patrick Pham inscrit É${stage.number}`);
  }

  // 3. Genres
  const riders = await prisma.rider.findMany();
  const womenSet = new Set(WOMEN);
  let womenCount = 0;
  for (const rider of riders) {
    const isWoman = womenSet.has(normalize(rider.firstName));
    if (isWoman) {
      await prisma.rider.update({
        where: { id: rider.id },
        data: { gender: "f" },
      });
      womenCount++;
      console.log(`✅ gender=f : ${rider.firstName}`);
    }
  }
  const expected = WOMEN.length;
  if (womenCount !== expected) {
    console.log(
      `⚠️  ${womenCount}/${expected} coureuses trouvées — vérifier les prénoms non matchés`
    );
    const found = new Set(
      riders.filter((r) => womenSet.has(normalize(r.firstName))).map((r) => normalize(r.firstName))
    );
    for (const w of WOMEN) {
      if (!found.has(w)) console.log(`   ❌ non trouvée : ${w}`);
    }
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
