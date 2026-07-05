/**
 * Passe tous les checkpoints des étapes réelles (1 à 6) à un rayon de 150 m.
 *
 * Avec Traccar (1 ping toutes les 10-15 s), un coureur parcourt 85 à 165 m
 * entre deux points : les rayons de 60-80 m pouvaient être traversés sans
 * qu'aucun ping ne tombe dedans. Le chevauchement départ/arrivée (boucles)
 * est géré par l'armement des geofences (lib/gps/geofence.ts).
 *
 * Usage : npx tsx scripts/update-checkpoint-radii.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const RADIUS_M = 150;

async function main() {
  const result = await prisma.checkpoint.updateMany({
    where: { stage: { number: { gt: 0 } }, radiusM: { lt: RADIUS_M } },
    data: { radiusM: RADIUS_M },
  });
  console.log(`✅ ${result.count} checkpoint(s) passé(s) à ${RADIUS_M} m`);

  const checkpoints = await prisma.checkpoint.findMany({
    where: { stage: { number: { gt: 0 } } },
    orderBy: [{ stage: { number: "asc" } }, { order: "asc" }],
    select: { name: true, radiusM: true, stage: { select: { number: true } } },
  });
  for (const cp of checkpoints) {
    console.log(`   étape ${cp.stage.number} — ${cp.name} : ${cp.radiusM} m`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
