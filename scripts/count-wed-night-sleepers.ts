import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  for (const l of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const t = l.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 0) continue;
    if (!process.env[t.slice(0, i)]) process.env[t.slice(0, i)] = t.slice(i + 1).replace(/^["']|["']$/g, '');
  }
}

async function main() {
  const p = new PrismaClient();

  const raceStages = await p.stage.findMany({
    where: { number: { gte: 1, lte: 6 } },
    orderBy: { number: 'asc' },
    select: { id: true, number: true, type: true },
  });
  const mountainStageIds = new Set(raceStages.filter((s) => s.type === 'mountain').map((s) => s.id));
  const flatStageIds = new Set(raceStages.filter((s) => s.type !== 'mountain').map((s) => s.id));

  const riders = await p.rider.findMany({
    include: {
      team: { select: { name: true } },
      entries: {
        where: { stageId: { in: raceStages.map((s) => s.id) }, status: 'registered' },
        select: { stageId: true },
      },
    },
    orderBy: [{ team: { name: 'asc' } }, { firstName: 'asc' }],
  });

  // Catégorisation pour la nuit du mercredi 22/07 → jeudi 23/07
  const fullTour: typeof riders = [];          // inscrits 1ʳᵉ ET 2ᵉ partie → dorment
  const mountainOnly: typeof riders = [];      // arrivent mercredi soir → dorment
  const firstPartOnly: typeof riders = [];     // partent mercredi soir → ne dorment PAS (sauf Coco)
  const noRaceStage: typeof riders = [];       // pas inscrits aux étapes 1-6

  for (const r of riders) {
    const stageIds = new Set(r.entries.map((e) => e.stageId));
    if (stageIds.size === 0) {
      noRaceStage.push(r);
      continue;
    }
    const hasMountain = [...stageIds].some((id) => mountainStageIds.has(id));
    const hasFlat = [...stageIds].some((id) => flatStageIds.has(id));
    if (hasMountain && hasFlat) fullTour.push(r);
    else if (hasMountain) mountainOnly.push(r);
    else if (hasFlat) firstPartOnly.push(r);
  }

  const display = (r: typeof riders[number]) => `${r.firstName}${r.nickname ? ` "${r.nickname}"` : ''} [${r.team.name}]`;

  console.log('═══════════════════════════════════════════════════════');
  console.log('NUIT DU MERCREDI 22/07 → JEUDI 23/07');
  console.log('═══════════════════════════════════════════════════════\n');

  console.log(`▸ Tour complet (1ʳᵉ + 2ᵉ partie) — dorment : ${fullTour.length}`);
  for (const r of fullTour) console.log(`    • ${display(r)}`);

  console.log(`\n▸ Montagne uniquement (arrivent merc. soir) — dorment : ${mountainOnly.length}`);
  for (const r of mountainOnly) console.log(`    • ${display(r)}`);

  console.log(`\n▸ 1ʳᵉ partie uniquement (partent merc. soir) — NE dorment PAS (sauf si spectateur) : ${firstPartOnly.length}`);
  for (const r of firstPartOnly) console.log(`    • ${display(r)}`);

  console.log(`\n▸ Inscrits à aucune étape de course (test Paris uniquement ?) : ${noRaceStage.length}`);
  for (const r of noRaceStage) console.log(`    • ${display(r)}`);

  console.log('\n───────────────────────────────────────────────────────');
  console.log('CALCUL THÉORIQUE');
  console.log('───────────────────────────────────────────────────────');
  console.log(`Tour complet            : ${fullTour.length}`);
  console.log(`+ Montagne uniquement   : ${mountainOnly.length}`);
  console.log(`+ Coco (spectatrice)    : 1   (selon ton info)`);
  console.log(`= TOTAL coureurs nuit   : ${fullTour.length + mountainOnly.length + 1}`);
  console.log('');
  console.log('Note : ce total n\'inclut PAS d\'éventuels organisateurs / partenaires / spectateurs');
  console.log('       hors-coureurs qui dorment aussi sur place.');

  await p.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
