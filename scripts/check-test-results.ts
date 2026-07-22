/**
 * Inspecte les données du test terrain sur l'étape 0.
 * Usage : npx tsx scripts/check-test-results.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const stage = await prisma.stage.findUnique({
    where: { number: 0 },
    include: {
      checkpoints: { orderBy: { order: "asc" } },
    },
  });
  if (!stage) {
    console.log("❌ Étape 0 introuvable");
    return;
  }

  console.log(`▸ Étape 0 — ${stage.name}`);
  console.log(`  status=${stage.status}  startTime=${stage.startTime?.toISOString() ?? "null"}  endTime=${stage.endTime?.toISOString() ?? "null"}`);
  console.log(`  gpxUrl=${stage.gpxUrl}  distance=${stage.distanceKm} km`);
  console.log(`  ${stage.checkpoints.length} checkpoints`);
  for (const cp of stage.checkpoints) {
    console.log(`    ${cp.order}. ${cp.name}  (${cp.latitude}, ${cp.longitude})  r=${cp.radiusM}m`);
  }

  const entries = await prisma.stageEntry.findMany({
    where: { stageId: stage.id, status: { in: ["tracking", "started", "finished"] } },
    include: {
      rider: { select: { firstName: true } },
      _count: { select: { gpsPositions: true, timeRecords: true } },
    },
  });

  console.log(`\n▸ Entries actives : ${entries.length}`);
  for (const e of entries) {
    console.log(`  - ${e.rider.firstName} (entry ${e.id}) status=${e.status} positions=${e._count.gpsPositions} timeRecords=${e._count.timeRecords}`);
  }

  // For each active entry, show details
  for (const e of entries) {
    if (e._count.gpsPositions === 0 && e._count.timeRecords === 0) continue;
    console.log(`\n▸ Détails ${e.rider.firstName} (entry ${e.id})`);

    const first = await prisma.gpsPosition.findFirst({
      where: { entryId: e.id },
      orderBy: { timestamp: "asc" },
    });
    const last = await prisma.gpsPosition.findFirst({
      where: { entryId: e.id },
      orderBy: { timestamp: "desc" },
    });
    if (first && last) {
      const durationMin = (last.timestamp.getTime() - first.timestamp.getTime()) / 60000;
      console.log(`  GPS : ${e._count.gpsPositions} points, de ${first.timestamp.toISOString()} à ${last.timestamp.toISOString()} (${durationMin.toFixed(1)} min)`);
      console.log(`        première position : (${first.latitude.toFixed(6)}, ${first.longitude.toFixed(6)}) acc=${first.accuracy}m`);
      console.log(`        dernière position : (${last.latitude.toFixed(6)}, ${last.longitude.toFixed(6)}) acc=${last.accuracy}m`);
    }

    const tr = await prisma.timeRecord.findMany({
      where: { entryId: e.id },
      include: { checkpoint: { select: { name: true, order: true } } },
      orderBy: { timestamp: "asc" },
    });
    console.log(`  Time records : ${tr.length}`);
    let prevTs: Date | null = null;
    for (const t of tr) {
      const delta = prevTs ? ((t.timestamp.getTime() - prevTs.getTime()) / 1000).toFixed(1) + "s" : "—";
      console.log(`    ${t.checkpoint.order}. ${t.checkpoint.name}  @ ${t.timestamp.toISOString()}  (+${delta})`);
      prevTs = t.timestamp;
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
