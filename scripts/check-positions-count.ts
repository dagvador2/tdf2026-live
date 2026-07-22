import { prisma } from '../src/lib/db';

async function main() {
  const stages = await prisma.stage.findMany({ select: { id: true, number: true, name: true } });
  for (const s of stages) {
    const count = await prisma.gpsPosition.count({ where: { entry: { stageId: s.id } } });
    console.log(`Étape ${s.number} (${s.name}): ${count} positions — id=${s.id}`);
  }
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
