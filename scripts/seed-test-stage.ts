/**
 * Crée l'étape 0 "Test Paris" avec 4 checkpoints calés sur le GPX
 * `/gpx/test-paris.gpx` et inscrit tous les coureurs existants.
 *
 * Usage : npx tsx scripts/seed-test-stage.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Supprimer l'étape 0 si elle existe déjà (re-run safe)
  const existing = await prisma.stage.findUnique({ where: { number: 0 } });
  if (existing) {
    // Cascade delete: entries, checkpoints, etc.
    await prisma.gpsPosition.deleteMany({
      where: { entry: { stageId: existing.id } },
    });
    await prisma.timeRecord.deleteMany({
      where: { entry: { stageId: existing.id } },
    });
    await prisma.stageEntry.deleteMany({ where: { stageId: existing.id } });
    await prisma.checkpoint.deleteMany({ where: { stageId: existing.id } });
    await prisma.livePost.deleteMany({ where: { stageId: existing.id } });
    await prisma.stage.delete({ where: { id: existing.id } });
    console.log("🗑️  Étape 0 existante supprimée");
  }

  // Créer l'étape 0
  const stage = await prisma.stage.create({
    data: {
      number: 0,
      name: "Test Paris",
      type: "road",
      date: new Date("2026-06-01T10:00:00+02:00"),
      distanceKm: 0.4,
      elevationM: 5,
      gpxUrl: "/gpx/test-paris.gpx",
      status: "upcoming",
    },
  });
  console.log(`✅ Étape 0 créée : ${stage.id}`);

  // 4 checkpoints placés sur des trackpoints du GPX (test-paris.gpx ≈ 400 m).
  // Distances directes entre voisins ≥ 99 m → pas de chevauchement à 40-50 m.
  const checkpoints = await Promise.all([
    prisma.checkpoint.create({
      data: {
        stageId: stage.id,
        name: "Départ",
        type: "start",
        latitude: 48.836224,
        longitude: 2.402916,
        radiusM: 50,
        order: 1,
        kmFromStart: 0,
        elevation: 46,
      },
    }),
    prisma.checkpoint.create({
      data: {
        stageId: stage.id,
        name: "CP1 — Cours de Vincennes",
        type: "sprint",
        latitude: 48.836417,
        longitude: 2.404225,
        radiusM: 40,
        order: 2,
        kmFromStart: 0.13,
        elevation: 42,
      },
    }),
    prisma.checkpoint.create({
      data: {
        stageId: stage.id,
        name: "CP2 — Mi-parcours",
        type: "sprint",
        latitude: 48.835902,
        longitude: 2.405641,
        radiusM: 40,
        order: 3,
        kmFromStart: 0.26,
        elevation: 43,
      },
    }),
    prisma.checkpoint.create({
      data: {
        stageId: stage.id,
        name: "Arrivée",
        type: "finish",
        latitude: 48.835088,
        longitude: 2.407272,
        radiusM: 40,
        order: 4,
        kmFromStart: 0.4,
        elevation: 49,
      },
    }),
  ]);
  console.log(`✅ ${checkpoints.length} checkpoints créés`);

  // Inscrire tous les coureurs
  const riders = await prisma.rider.findMany({ select: { id: true } });
  const entries = await prisma.stageEntry.createMany({
    data: riders.map((r) => ({
      riderId: r.id,
      stageId: stage.id,
    })),
  });
  console.log(`✅ ${entries.count} coureurs inscrits`);

  console.log("\n🎉 Étape 0 'Test Paris' prête !");
  console.log(`   ID : ${stage.id}`);
  console.log(`   GPX : ${stage.gpxUrl}`);
  console.log("   → /admin/etapes → ouvre l'étape 0");
  console.log("   → Clique 'Démarrer' pour passer en LIVE");
  console.log("   → Sur ton tel : connecte-toi puis va sur /mon-espace/course");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
