/**
 * Reconfigure l'étape 0 de test sur le parcours de Vincennes (GPX
 * public/gpx/etape-0-test-vincennes.gpx, ~400 m) :
 *
 *   1. Purge les données des anciens tests (positions GPS, temps),
 *      remet les inscriptions à "registered"
 *   2. Remplace les checkpoints du Ventoux par 3 checkpoints sur le parcours
 *      (rayon 40 m, adapté à la longueur du parcours)
 *   3. Met à jour l'étape (nom, GPX, distance, D+) et la repasse en "upcoming"
 *
 * Pour tester : passer l'étape en "live" depuis /admin/etapes, démarrer
 * Traccar Client, faire la boucle. Repasser en "upcoming" après le test.
 *
 * Usage : npx tsx scripts/setup-stage0-vincennes.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Points extraits du GPX (départ, mi-parcours, arrivée).
const CHECKPOINTS = [
  {
    name: "Départ — Vincennes",
    type: "start" as const,
    latitude: 48.83622407913208,
    longitude: 2.4029159545898438,
    radiusM: 40,
    order: 1,
    kmFromStart: 0,
    elevation: 46,
  },
  {
    name: "CP1 — mi-parcours",
    type: "sprint" as const,
    latitude: 48.836020063608885,
    longitude: 2.4052982591092587,
    radiusM: 40,
    order: 2,
    kmFromStart: 0.22,
    elevation: 42,
  },
  {
    name: "Arrivée — Vincennes",
    type: "finish" as const,
    latitude: 48.83508791215718,
    longitude: 2.4072715267539024,
    radiusM: 40,
    order: 3,
    kmFromStart: 0.4,
    elevation: 49,
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
  console.log(`📍 ${CHECKPOINTS.length} checkpoints créés (rayon 40 m)`);

  // 3. Mise à jour de l'étape
  await prisma.stage.update({
    where: { id: stage.id },
    data: {
      name: "Étape test — Vincennes",
      type: "road",
      date: new Date("2026-07-05T00:00:00+02:00"),
      distanceKm: 0.4,
      elevationM: 7,
      gpxUrl: "/gpx/etape-0-test-vincennes.gpx",
      status: "upcoming",
      startTime: null,
      endTime: null,
    },
  });
  console.log(
    "✅ Étape 0 → « Étape test — Vincennes » (0.4 km, statut upcoming)"
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
