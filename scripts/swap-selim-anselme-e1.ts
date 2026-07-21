/**
 * É1 (20/07) : Sélim forfait aujourd'hui, remplacé par Anselme Gautier.
 * - Recrée Anselme (supprimé en mai) : RedBull Vodka Hangover, code Traccar neuf.
 * - É1 : l'inscription de Sélim est supprimée (ou passée DNS si des données
 *   GPS/temps existent déjà) et Anselme est inscrit à sa place.
 * - Sélim reste inscrit sur É2-É6.
 */
import { randomInt } from "crypto";
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

// Même alphabet que generate-traccar-codes.ts (sans 0/O/1/I/L)
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
function randomCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) code += ALPHABET[randomInt(ALPHABET.length)];
  return code;
}

async function main() {
  const prisma = new PrismaClient();

  const redbull = await prisma.team.findUnique({
    where: { slug: "redbull-vodka-hangover" },
  });
  if (!redbull) throw new Error("Équipe RedBull introuvable");

  const stage1 = await prisma.stage.findUnique({ where: { number: 1 } });
  if (!stage1) throw new Error("Étape 1 introuvable");
  console.log(`É1 : ${stage1.name} — statut ${stage1.status}`);

  // 1. Anselme : recréation (ou réutilisation s'il existe déjà)
  let anselme = await prisma.rider.findFirst({
    where: { firstName: { contains: "Anselme" } },
  });
  if (anselme) {
    console.log(`⚠️  Anselme existe déjà (${anselme.firstName}) — réutilisé`);
  } else {
    const used = new Set(
      (
        await prisma.rider.findMany({
          where: { traccarDeviceId: { not: null } },
          select: { traccarDeviceId: true },
        })
      ).map((r) => r.traccarDeviceId as string)
    );
    let code = randomCode();
    while (used.has(code)) code = randomCode();

    anselme = await prisma.rider.create({
      data: {
        firstName: "Anselme Gautier",
        slug: "anselme-gautier",
        teamId: redbull.id,
        gender: "m",
        editionCount: 1,
        funFacts: {},
        traccarDeviceId: code,
      },
    });
    console.log(`✅ Anselme Gautier recréé chez ${redbull.name}`);
  }

  // 2. Sélim : sort des inscrits É1 (DNS si des données existent déjà)
  const selim = await prisma.rider.findFirst({
    where: { firstName: { contains: "Sélim" } },
  });
  if (!selim) throw new Error("Sélim introuvable");

  const selimEntry = await prisma.stageEntry.findUnique({
    where: { riderId_stageId: { riderId: selim.id, stageId: stage1.id } },
    include: { _count: { select: { timeRecords: true, gpsPositions: true } } },
  });
  if (!selimEntry) {
    console.log("⚠️  Sélim n'était pas inscrit sur É1");
  } else if (
    selimEntry._count.timeRecords > 0 ||
    selimEntry._count.gpsPositions > 0
  ) {
    await prisma.stageEntry.update({
      where: { id: selimEntry.id },
      data: { status: "dns" },
    });
    console.log(
      `✅ Sélim → DNS sur É1 (données existantes conservées : ${selimEntry._count.timeRecords} temps, ${selimEntry._count.gpsPositions} positions)`
    );
  } else {
    await prisma.stageEntry.delete({ where: { id: selimEntry.id } });
    console.log("✅ Inscription É1 de Sélim supprimée (aucune donnée)");
  }

  // 3. Anselme inscrit sur É1
  await prisma.stageEntry.upsert({
    where: { riderId_stageId: { riderId: anselme.id, stageId: stage1.id } },
    create: { riderId: anselme.id, stageId: stage1.id, status: "registered" },
    update: {},
  });
  console.log("✅ Anselme inscrit sur É1");

  // Résumé
  console.log(`\n📟 Code Traccar d'Anselme : ${anselme.traccarDeviceId}`);
  console.log(`   Email lié : ${anselme.email ?? "(aucun — à renseigner pour le login Google)"}`);

  const entries = await prisma.stageEntry.findMany({
    where: {
      stageId: stage1.id,
      status: { not: "dns" },
      rider: { team: { slug: { not: "sans-equipe" } } },
    },
    include: {
      rider: { select: { firstName: true, team: { select: { name: true } } } },
    },
  });
  const byTeam = new Map<string, string[]>();
  for (const e of entries) {
    const t = e.rider.team.name;
    if (!byTeam.has(t)) byTeam.set(t, []);
    byTeam.get(t)!.push(e.rider.firstName);
  }
  console.log("\n=== Inscrits É1 (non-DNS) ===");
  let k = Infinity;
  for (const [team, names] of byTeam) {
    k = Math.min(k, names.length);
    console.log(`${team} (${names.length}) : ${names.sort().join(" · ")}`);
  }
  console.log(`⇒ K=${k}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
