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

type Logistics = {
  arrivalMethod?: string | null;
  arrivalDate?: string | null;
  arrivalTime?: string | null;
  arrivalLocation?: string | null;
  notes?: string | null;
} | null;

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

  // Catégories
  const fullTour: typeof riders = [];
  const mountainOnly: typeof riders = [];
  const firstPartOnly: typeof riders = [];

  for (const r of riders) {
    const stageIds = new Set(r.entries.map((e) => e.stageId));
    if (stageIds.size === 0) continue;
    const hasMountain = [...stageIds].some((id) => mountainStageIds.has(id));
    const hasFlat = [...stageIds].some((id) => flatStageIds.has(id));
    if (hasMountain && hasFlat) fullTour.push(r);
    else if (hasMountain) mountainOnly.push(r);
    else if (hasFlat) firstPartOnly.push(r);
  }

  const display = (r: typeof riders[number]) => `${r.firstName}${r.nickname ? ` "${r.nickname}"` : ''} [${r.team.name}]`;

  // Dates d'arrivée saisies pour le groupe 1ʳᵉ partie (full tour + first part only)
  const firstPartGroup = [...fullTour, ...firstPartOnly];

  console.log('═════════════════════════════════════════════════════════════');
  console.log('DATES D\'ARRIVÉE SAISIES — groupe 1ʳᵉ partie (tour complet + 1ʳᵉ partie only)');
  console.log('═════════════════════════════════════════════════════════════\n');

  for (const r of firstPartGroup) {
    const l = r.logistics as Logistics;
    const arr = l?.arrivalDate ? `${l.arrivalDate}${l.arrivalTime ? ' ' + l.arrivalTime : ''}` : '— (non renseigné)';
    console.log(`  ${display(r).padEnd(55)} → ${arr}`);
  }

  console.log('');
  console.log('═════════════════════════════════════════════════════════════');
  console.log('OCCUPATION NUIT PAR NUIT (sur la base de tes infos)');
  console.log('═════════════════════════════════════════════════════════════\n');

  console.log('Hypothèses :');
  console.log('  • Tous ceux qui font la 1ʳᵉ partie sont là dès dimanche soir 19/07');
  console.log('  • SAUF Jules Seguin et Kévin Lorenzo "Kéké" qui arrivent lundi matin 20/07');
  console.log('  • Quentin Lambert et Kévin Lorenzo repartent mercredi soir 22/07');
  console.log('  • Coco reste mercredi soir comme spectatrice');
  console.log('  • Les 7 montagne uniquement arrivent mercredi soir 22/07');
  console.log('');

  const firstPartTotal = fullTour.length + firstPartOnly.length; // 19 + 3 = 22
  const sundayNight = firstPartTotal - 2; // - Jules - Kevin
  const mondayNight = firstPartTotal;
  const tuesdayNight = firstPartTotal;
  const wednesdayNight = firstPartTotal - 2 + mountainOnly.length; // - Quentin - Kévin + 7

  console.log(`  Dim. 19/07 → Lun. 20/07  : ${sundayNight}  (${firstPartTotal} − Jules − Kéké)`);
  console.log(`  Lun. 20/07 → Mar. 21/07  : ${mondayNight}  (Jules + Kéké rejoignent)`);
  console.log(`  Mar. 21/07 → Mer. 22/07  : ${tuesdayNight}  (idem)`);
  console.log(`  Mer. 22/07 → Jeu. 23/07  : ${wednesdayNight}  (− Quentin − Kéké + 7 montagne)`);

  await p.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
