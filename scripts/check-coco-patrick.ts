/** Lecture seule : inscriptions de Coco et Patrick + effectif par étape/équipe. */
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
  const p = new PrismaClient();

  for (const name of ["Coco", "Patrick Pham"]) {
    const rider = await p.rider.findFirst({
      where: { firstName: name },
      include: {
        team: { select: { name: true } },
        entries: {
          include: {
            stage: { select: { number: true } },
            timeRecords: { select: { id: true } },
            _count: { select: { gpsPositions: true } },
          },
        },
      },
    });
    if (!rider) {
      console.log(`❌ ${name} introuvable`);
      continue;
    }
    console.log(`\n${rider.firstName} [${rider.team.name}] id=${rider.id}`);
    for (const e of rider.entries.sort((a, b) => a.stage.number - b.stage.number)) {
      console.log(
        `   É${e.stage.number}: status=${e.status}, timeRecords=${e.timeRecords.length}, gps=${e._count.gpsPositions}`
      );
    }
    if (rider.entries.length === 0) console.log("   (aucune inscription)");
  }

  console.log("\n=== Inscrits par étape (détail Visma + EAU) ===");
  const entries = await p.stageEntry.findMany({
    where: { stage: { number: { gte: 1 } } },
    include: {
      stage: { select: { number: true } },
      rider: { select: { firstName: true, team: { select: { slug: true } } } },
    },
  });
  for (const slug of ["visma-ricard", "eau-pastis-xrg"]) {
    console.log(`\n${slug}:`);
    for (let n = 1; n <= 6; n++) {
      const names = entries
        .filter((e) => e.stage.number === n && e.rider.team.slug === slug)
        .map((e) => e.rider.firstName);
      console.log(`   É${n} (${names.length}): ${names.join(" · ")}`);
    }
  }

  await p.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
