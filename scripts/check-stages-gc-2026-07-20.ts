// Lecture seule — état des étapes + classement général après É1 (préparation ordre de passage CLM)
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import {
  computeStageResults,
  rankStageResults,
  applyTeamTTTime,
  computeStageK,
  computeGeneralClassification,
} from '../src/lib/standings/calculator';

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
  const prisma = new PrismaClient();

  const stages = await prisma.stage.findMany({
    orderBy: { number: 'asc' },
    select: { number: true, name: true, type: true, date: true, status: true },
  });
  console.log('=== STAGES (prod) ===');
  for (const s of stages) {
    console.log(
      `É${s.number} | ${s.date.toISOString().slice(0, 10)} | ${String(s.type).padEnd(14)} | ${String(s.status).padEnd(9)} | ${s.name}`
    );
  }

  const riders = await prisma.rider.findMany({ include: { team: true } });
  console.log('\n=== RIDERS ===');
  for (const r of riders.sort((a, b) => a.firstName.localeCompare(b.firstName))) {
    console.log(
      `${r.firstName} | nickname=${r.nickname ?? '-'} | slug=${r.slug} | team=${r.team.slug} | gender=${r.gender}`
    );
  }

  // GC = même logique que src/app/classements/page.tsx (étapes finished, n° >= 1)
  const finished = await prisma.stage.findMany({
    where: { status: 'finished', number: { gte: 1 } },
    orderBy: { number: 'asc' },
    include: {
      entries: {
        include: {
          rider: { include: { team: true } },
          timeRecords: { include: { checkpoint: true } },
        },
      },
    },
  });

  const stageResultsMap = new Map<number, ReturnType<typeof rankStageResults>>();
  for (const stage of finished) {
    const entries = stage.entries.filter((e) => e.rider.team.slug !== 'sans-equipe');
    const presentByTeam = new Map<string, number>();
    for (const entry of entries) {
      if (entry.status === 'dns') continue;
      presentByTeam.set(entry.rider.teamId, (presentByTeam.get(entry.rider.teamId) ?? 0) + 1);
    }
    const k = computeStageK(presentByTeam);
    const records = entries.flatMap((entry) =>
      entry.timeRecords.map((tr) => ({
        riderId: entry.rider.id,
        teamId: entry.rider.teamId,
        checkpointType: tr.checkpoint.type,
        timestamp: tr.timestamp.getTime(),
        entryStatus: entry.status,
      }))
    );
    const results = computeStageResults(records);
    const individualResults =
      stage.type === 'team_tt' && k > 0 ? applyTeamTTTime(results, k) : results;
    stageResultsMap.set(stage.number, rankStageResults(individualResults));
  }

  const gc = computeGeneralClassification(stageResultsMap, finished.length, 'all');
  const riderById = new Map(riders.map((r) => [r.id, r]));
  console.log(`\n=== CLASSEMENT GÉNÉRAL (après ${finished.length} étape(s) finished) ===`);
  for (const e of gc) {
    const r = riderById.get(e.riderId);
    const totalS = Math.round(e.totalMs / 1000);
    const h = Math.floor(totalS / 3600);
    const m = Math.floor((totalS % 3600) / 60);
    const s = totalS % 60;
    console.log(
      `#${String(e.rank).padStart(2)} | ${(r?.firstName ?? e.riderId).padEnd(12)} | ${r?.nickname ?? '-'} | ${h}h${String(m).padStart(2, '0')}m${String(s).padStart(2, '0')}s | ${r?.team.slug}`
    );
  }

  await prisma.$disconnect();
}

main();
