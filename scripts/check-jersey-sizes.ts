/**
 * Rapport des tailles de maillot remplies ou manquantes.
 * Usage : DATABASE_URL=... npx tsx scripts/check-jersey-sizes.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const teams = await prisma.team.findMany({
    where: { slug: { not: "sans-equipe" } },
    orderBy: { name: "asc" },
    include: {
      riders: {
        orderBy: { firstName: "asc" },
        select: { firstName: true, jerseySize: true },
      },
    },
  });

  let totalFilled = 0;
  let totalMissing = 0;
  const sizeCount: Record<string, number> = {};

  for (const team of teams) {
    console.log(`\n━━ ${team.name} (${team.riders.length}) ━━`);
    const filled = team.riders.filter((r) => r.jerseySize);
    const missing = team.riders.filter((r) => !r.jerseySize);
    totalFilled += filled.length;
    totalMissing += missing.length;

    if (filled.length) {
      console.log("  ✓ Remplies :");
      for (const r of filled) {
        console.log(`     ${r.firstName.padEnd(28)} ${r.jerseySize}`);
        sizeCount[r.jerseySize!] = (sizeCount[r.jerseySize!] ?? 0) + 1;
      }
    }
    if (missing.length) {
      console.log("  ✗ Manquantes :");
      for (const r of missing) {
        console.log(`     ${r.firstName}`);
      }
    }
  }

  const sansEquipe = await prisma.rider.findMany({
    where: { team: { slug: "sans-equipe" } },
    select: { firstName: true, jerseySize: true },
  });
  if (sansEquipe.length) {
    console.log(`\n━━ Sans équipe (${sansEquipe.length}) — non comptés ━━`);
    for (const r of sansEquipe) {
      console.log(`     ${r.firstName.padEnd(28)} ${r.jerseySize ?? "—"}`);
    }
  }

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`Total équipes : ${totalFilled} / ${totalFilled + totalMissing} taille remplie`);
  console.log("Répartition des tailles connues :");
  for (const size of ["XS", "S", "M", "L", "XL", "XXL"]) {
    if (sizeCount[size]) console.log(`  ${size.padEnd(4)} ${sizeCount[size]}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
