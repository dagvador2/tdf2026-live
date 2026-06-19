/**
 * Crée l'étape 0 "Test Ventoux — Malaucène" avec 4 checkpoints calés sur
 * le GPX `/gpx/ventoux-malaucene.gpx` (montée du Ventoux côté Malaucène,
 * 20,45 km / 1556 m D+) et inscrit tous les coureurs existants.
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
      name: "Test Ventoux — Malaucène",
      type: "mountain",
      date: new Date("2026-06-20T08:00:00+02:00"),
      distanceKm: 20.45,
      elevationM: 1556,
      gpxUrl: "/gpx/ventoux-malaucene.gpx",
      status: "upcoming",
    },
  });
  console.log(`✅ Étape 0 créée : ${stage.id}`);

  // 4 checkpoints calés sur des trackpoints réels du GPX (Malaucène → sommet).
  // Espacements ≥ 6 km → aucun chevauchement de geofence.
  const checkpoints = await Promise.all([
    prisma.checkpoint.create({
      data: {
        stageId: stage.id,
        name: "Départ — Malaucène",
        type: "start",
        latitude: 44.173214,
        longitude: 5.133705,
        radiusM: 80,
        order: 1,
        kmFromStart: 0,
        elevation: 332,
      },
    }),
    prisma.checkpoint.create({
      data: {
        stageId: stage.id,
        name: "CP1 — km 6,8",
        type: "sprint",
        latitude: 44.167212,
        longitude: 5.175143,
        radiusM: 60,
        order: 2,
        kmFromStart: 6.75,
        elevation: 792,
      },
    }),
    prisma.checkpoint.create({
      data: {
        stageId: stage.id,
        name: "CP2 — Mont Serein (km 13,5)",
        type: "sprint",
        latitude: 44.177152,
        longitude: 5.241482,
        radiusM: 60,
        order: 3,
        kmFromStart: 13.51,
        elevation: 1372,
      },
    }),
    prisma.checkpoint.create({
      data: {
        stageId: stage.id,
        name: "Sommet du Ventoux",
        type: "finish",
        latitude: 44.174085,
        longitude: 5.279415,
        radiusM: 100,
        order: 4,
        kmFromStart: 20.45,
        elevation: 1889,
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

  console.log("\n🎉 Étape 0 'Test Ventoux — Malaucène' prête !");
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
