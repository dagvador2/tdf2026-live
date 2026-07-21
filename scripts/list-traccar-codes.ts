/** Lecture seule : codes Traccar par équipe (pour le support PowerPoint). */
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const envPath = path.resolve(__dirname, "../.env.local");
if (fs.existsSync(envPath)) {
  for (const l of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const t = l.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    if (!process.env[t.slice(0, i)])
      process.env[t.slice(0, i)] = t.slice(i + 1).replace(/^["']|["']$/g, "");
  }
}

async function main() {
  const prisma = new PrismaClient();
  const teams = await prisma.team.findMany({
    where: { slug: { not: "sans-equipe" } },
    include: { riders: { orderBy: { firstName: "asc" } } },
    orderBy: { name: "asc" },
  });

  let missing = 0;
  for (const team of teams) {
    console.log(`\n${team.name} (${team.color})`);
    for (const r of team.riders) {
      if (!r.traccarDeviceId) missing++;
      console.log(`   ${(r.traccarDeviceId ?? "❌ MANQUANT").padEnd(8)} ${r.firstName}`);
    }
  }
  if (missing > 0) {
    console.log(`\n⚠️  ${missing} coureur(s) sans code — lancer scripts/generate-traccar-codes.ts`);
  }
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
