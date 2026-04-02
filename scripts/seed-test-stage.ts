/**
 * Crée l'étape 0 "Test Paris" avec 3 checkpoints
 * et inscrit tous les coureurs existants.
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
      date: new Date("2026-04-05T10:00:00+02:00"),
      distanceKm: 4.7,
      elevationM: 33,
      status: "upcoming",
    },
  });
  console.log(`✅ Étape 0 créée : ${stage.id}`);

  // Créer 3 checkpoints
  const checkpoints = await Promise.all([
    prisma.checkpoint.create({
      data: {
        stageId: stage.id,
        name: "Départ — Cours de Vincennes",
        type: "start",
        latitude: 48.83666,
        longitude: 2.40347,
        radiusM: 80,
        order: 1,
        kmFromStart: 0,
        elevation: 43,
      },
    }),
    prisma.checkpoint.create({
      data: {
        stageId: stage.id,
        name: "Sprint — Rue de Lagny",
        type: "sprint",
        latitude: 48.83604,
        longitude: 2.42268,
        radiusM: 80,
        order: 2,
        kmFromStart: 1.6,
        elevation: 55,
      },
    }),
    prisma.checkpoint.create({
      data: {
        stageId: stage.id,
        name: "Arrivée — Charenton",
        type: "finish",
        latitude: 48.827,
        longitude: 2.45421,
        radiusM: 80,
        order: 3,
        kmFromStart: 4.7,
        elevation: 56,
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
  console.log("   → Va dans /admin/etapes pour la voir");
  console.log("   → Upload le GPX depuis la page détail");
  console.log("   → Clique 'Démarrer' quand tu es prêt à tester");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
