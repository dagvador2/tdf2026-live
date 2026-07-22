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

const METHOD_LABELS: Record<string, string> = {
  car: 'Voiture',
  train: 'Train',
  carpool: 'Covoiturage',
  other: 'Autre',
};

function fmtLogistics(l: Logistics): string {
  if (!l || (!l.arrivalMethod && !l.arrivalDate && !l.arrivalTime && !l.arrivalLocation && !l.notes)) {
    return '  ❌ AUCUNE INFO RENSEIGNÉE';
  }
  const parts: string[] = [];
  parts.push(`  • Moyen      : ${l.arrivalMethod ? METHOD_LABELS[l.arrivalMethod] ?? l.arrivalMethod : '(vide)'}`);
  parts.push(`  • Date       : ${l.arrivalDate || '(vide)'}`);
  parts.push(`  • Heure      : ${l.arrivalTime || '(vide)'}`);
  parts.push(`  • Lieu       : ${l.arrivalLocation || '(vide)'}`);
  if (l.notes) parts.push(`  • Notes      : ${l.notes}`);
  return parts.join('\n');
}

async function main() {
  const p = new PrismaClient();

  // Étapes de course (on exclut l'étape 0 = Test Paris)
  const raceStages = await p.stage.findMany({
    where: { number: { gte: 1, lte: 6 } },
    orderBy: { number: 'asc' },
    select: { id: true, number: true, name: true, type: true, date: true },
  });

  const mountainStageIds = new Set(raceStages.filter((s) => s.type === 'mountain').map((s) => s.id));
  const flatStageIds = new Set(raceStages.filter((s) => s.type !== 'mountain').map((s) => s.id));

  console.log('Étapes course (1-6):');
  for (const s of raceStages) {
    console.log(`  Étape ${s.number} — ${s.name} (${s.type})`);
  }
  console.log('');

  // Tous les coureurs avec leurs inscriptions aux étapes 1-6
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

  // 1. Coureurs inscrits UNIQUEMENT aux étapes de montagne (4, 5, 6) — pas aux étapes 1, 2, 3
  const mountainOnly = riders.filter((r) => {
    const stageIds = new Set(r.entries.map((e) => e.stageId));
    if (stageIds.size === 0) return false;
    const hasMountain = [...stageIds].some((id) => mountainStageIds.has(id));
    const hasFlat = [...stageIds].some((id) => flatStageIds.has(id));
    return hasMountain && !hasFlat;
  });

  // 2. Coureurs inscrits UNIQUEMENT à la première partie (1, 2, 3) — partent avant le mercredi soir
  const firstPartOnly = riders.filter((r) => {
    const stageIds = new Set(r.entries.map((e) => e.stageId));
    if (stageIds.size === 0) return false;
    const hasMountain = [...stageIds].some((id) => mountainStageIds.has(id));
    const hasFlat = [...stageIds].some((id) => flatStageIds.has(id));
    return hasFlat && !hasMountain;
  });

  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('🏔️  COUREURS INSCRITS UNIQUEMENT AUX ÉTAPES DE MONTAGNE (J4-J5-J6)');
  console.log('   → Ils ont besoin d\'un logement pour la nuit de mercredi 22/07');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log(`Total : ${mountainOnly.length} coureurs\n`);

  let withInfo = 0;
  let withoutInfo = 0;
  for (const r of mountainOnly) {
    const l = r.logistics as Logistics;
    const hasInfo = l && (l.arrivalMethod || l.arrivalDate || l.arrivalTime || l.arrivalLocation);
    if (hasInfo) withInfo++;
    else withoutInfo++;
    const display = `${r.firstName}${r.nickname ? ` "${r.nickname}"` : ''}`;
    console.log(`▸ ${display}  [${r.team.name}]`);
    console.log(fmtLogistics(l));
    console.log('');
  }

  console.log('───────────────────────────────────────────────────────────────────');
  console.log(`Renseignés : ${withInfo} / ${mountainOnly.length}`);
  console.log(`À relancer : ${withoutInfo} / ${mountainOnly.length}`);
  console.log('');

  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('🚴  COUREURS INSCRITS UNIQUEMENT À LA 1ʳᵉ PARTIE (J1-J2-J3)');
  console.log('   → Libèrent une place pour la nuit de mercredi (sauf si spectateur)');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log(`Total : ${firstPartOnly.length} coureurs\n`);

  for (const r of firstPartOnly) {
    const display = `${r.firstName}${r.nickname ? ` "${r.nickname}"` : ''}`;
    console.log(`▸ ${display}  [${r.team.name}]`);
  }

  await p.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
