import { prisma } from '../src/lib/db';

async function main() {
  const riders = await prisma.rider.findMany({
    select: {
      firstName: true,
      nickname: true,
      email: true,
      user: { select: { email: true } },
    },
    orderBy: { firstName: 'asc' },
  });
  const merged = riders.map(r => ({
    firstName: r.firstName,
    nickname: r.nickname,
    email: r.email ?? r.user?.email ?? null,
    source: r.email ? 'rider' : r.user?.email ? 'user' : null,
  }));
  const withEmail = merged.filter(r => r.email);
  const withoutEmail = merged.filter(r => !r.email);

  console.log(`\n=== ${withEmail.length} coureurs avec email ===\n`);
  for (const r of withEmail) {
    const label = r.nickname ? `${r.firstName} "${r.nickname}"` : r.firstName;
    console.log(`${label.padEnd(35)} ${r.email}  (${r.source})`);
  }

  console.log(`\n=== Emails seuls (copier-coller Google Meet) ===\n`);
  console.log(withEmail.map(r => r.email).join(', '));

  if (withoutEmail.length) {
    console.log(`\n=== ${withoutEmail.length} coureurs SANS email ===\n`);
    for (const r of withoutEmail) {
      const label = r.nickname ? `${r.firstName} "${r.nickname}"` : r.firstName;
      console.log(`- ${label}`);
    }
  }
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
