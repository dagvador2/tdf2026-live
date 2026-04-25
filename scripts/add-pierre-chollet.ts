/**
 * Cree Pierre Chollet (nouveau participant) avec une equipe au hasard.
 * A relancer scripts/seed-from-sheet.ts ensuite pour populer ses donnees.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.rider.findFirst({
    where: { firstName: "Pierre Chollet" },
  });
  if (existing) {
    console.log("Pierre Chollet existe deja, rien a faire.");
    return;
  }

  const teams = await prisma.team.findMany({ select: { id: true, name: true } });
  const team = teams[Math.floor(Math.random() * teams.length)];

  const slug = "pierre-chollet";
  const rider = await prisma.rider.create({
    data: {
      firstName: "Pierre Chollet",
      slug,
      teamId: team.id,
      editionCount: 1,
    },
  });
  console.log(`Cree : ${rider.firstName} (${rider.slug}) → equipe ${team.name}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
