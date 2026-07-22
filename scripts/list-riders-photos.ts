import { prisma } from '../src/lib/db';

async function main() {
  const riders = await prisma.rider.findMany({
    select: { id: true, firstName: true, nickname: true, slug: true, photoUrl: true },
    orderBy: { firstName: 'asc' },
  });
  for (const r of riders) {
    console.log(`${r.slug.padEnd(30)} | ${r.firstName.padEnd(25)} | ${(r.nickname ?? '').padEnd(15)} | photo=${r.photoUrl ? 'YES' : 'no'}`);
  }
  console.log(`\nTotal: ${riders.length}`);
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
