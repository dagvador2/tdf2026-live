/**
 * Reconfigure l'étape 0 de test sur le parcours de Vincennes v2 (GPX
 * public/gpx/etape-0-test-vincennes-v2.gpx, 3,7 km point-à-point) :
 *
 *   1. Purge les données des anciens tests (positions GPS, temps),
 *      remet les inscriptions à "registered"
 *   2. Remplace les checkpoints par 3 checkpoints sur le parcours (rayon 60 m)
 *   3. Met à jour l'étape (nom, GPX, distance, D+) et la repasse en "upcoming"
 *
 * Pour tester : passer l'étape en "live" depuis /admin/etapes, démarrer
 * Traccar Client, faire le parcours. Repasser en "upcoming" après le test
 * (jamais "finished" : l'étape entrerait au classement général).
 *
 * Usage : npx tsx scripts/setup-stage0-vincennes.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Points extraits du GPX (départ, mi-parcours à 1,86 km, arrivée).
const CHECKPOINTS = [
  {
    name: "Départ — Vincennes",
    type: "start" as const,
    latitude: 48.83622407913208,
    longitude: 2.402915870770812,
    radiusM: 60,
    order: 1,
    kmFromStart: 0,
    elevation: 45,
  },
  {
    name: "CP1 — mi-parcours",
    type: "sprint" as const,
    latitude: 48.83731867186725,
    longitude: 2.425028420984745,
    radiusM: 60,
    order: 2,
    kmFromStart: 1.86,
    elevation: 52,
  },
  {
    name: "Arrivée",
    type: "finish" as const,
    latitude: 48.834335803985596,
    longitude: 2.444479465484619,
    radiusM: 60,
    order: 3,
    kmFromStart: 3.7,
    elevation: 50,
  },
];

async function main() {
  const stage = await prisma.stage.findUnique({ where: { number: 0 } });
  if (!stage) {
    console.log("❌ Étape 0 introuvable");
    process.exit(1);
  }

  // 1. Purge des données de test précédentes
  const deletedRecords = await prisma.timeRecord.deleteMany({
    where: { entry: { stageId: stage.id } },
  });
  const deletedPositions = await prisma.gpsPosition.deleteMany({
    where: { entry: { stageId: stage.id } },
  });
  const resetEntries = await prisma.stageEntry.updateMany({
    where: { stageId: stage.id },
    data: { status: "registered" },
  });
  console.log(
    `🧹 Purge : ${deletedPositions.count} positions, ${deletedRecords.count} temps, ${resetEntries.count} inscriptions remises à "registered"`
  );

  // 2. Nouveaux checkpoints
  await prisma.checkpoint.deleteMany({ where: { stageId: stage.id } });
  for (const cp of CHECKPOINTS) {
    await prisma.checkpoint.create({ data: { ...cp, stageId: stage.id } });
  }
  console.log(`📍 ${CHECKPOINTS.length} checkpoints créés (rayon 60 m)`);

  // 3. Mise à jour de l'étape
  await prisma.stage.update({
    where: { id: stage.id },
    data: {
      name: "Étape test — Vincennes",
      type: "road",
      date: new Date("2026-07-05T00:00:00+02:00"),
      distanceKm: 3.7,
      elevationM: 26,
      gpxUrl: "/gpx/etape-0-test-vincennes-v2.gpx",
      status: "upcoming",
      startTime: null,
      endTime: null,
    },
  });
  console.log(
    "✅ Étape 0 → « Étape test — Vincennes » (3,7 km, statut upcoming)"
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
