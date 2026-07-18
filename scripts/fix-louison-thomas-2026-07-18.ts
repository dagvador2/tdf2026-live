/**
 * Corrections effectifs 18/07/2026 (suite) :
 * 1. Louison Timmerman est un homme → gender = 'm'.
 * 2. Thomas Barsack (Visma Ricard) court bien É4/É5/É6 → inscriptions.
 * Résultat attendu en montagne : Glaçons 6, EAU 6, Visma 7, RedBull 7 → K=6.
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

  // 1. Louison → homme
  const louison = await prisma.rider.findFirst({
    where: { firstName: "Louison Timmerman" },
  });
  if (!louison) throw new Error("Louison Timmerman introuvable");
  await prisma.rider.update({
    where: { id: louison.id },
    data: { gender: "m" },
  });
  console.log("✅ Louison Timmerman → gender=m");

  // 2. Thomas Barsack → É4/É5/É6
  const thomas = await prisma.rider.findFirst({
    where: { firstName: "Thomas Barsack" },
    include: { team: true },
  });
  if (!thomas) throw new Error("Thomas Barsack introuvable");
  if (thomas.team.slug !== "visma-ricard") {
    throw new Error(`Thomas Barsack est dans ${thomas.team.name}, pas Visma`);
  }

  const mountainStages = await prisma.stage.findMany({
    where: { number: { in: [4, 5, 6] } },
  });
  if (mountainStages.length !== 3) {
    throw new Error(`Étapes 4-6 incomplètes (${mountainStages.length}/3)`);
  }
  for (const stage of mountainStages) {
    const existing = await prisma.stageEntry.findUnique({
      where: { riderId_stageId: { riderId: thomas.id, stageId: stage.id } },
    });
    if (existing) {
      console.log(`⚠️  Thomas déjà inscrit É${stage.number}`);
      continue;
    }
    await prisma.stageEntry.create({
      data: { riderId: thomas.id, stageId: stage.id, status: "registered" },
    });
    console.log(`✅ Thomas Barsack inscrit É${stage.number}`);
  }

  // Résumé : présents par étape + genres
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
    const k = Math.min(...m.values());
    const parts = [...m.entries()].map(([t, n]) => `${t}: ${n}`).join(" | ");
    console.log(`É${num} → ${parts}  ⇒ K=${k}`);
  }

  const women = await prisma.rider.findMany({
    where: { gender: "f" },
    select: { firstName: true },
  });
  console.log(
    `\nCoureuses (gender=f) : ${women.map((w) => w.firstName).join(" · ")}`
  );

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
