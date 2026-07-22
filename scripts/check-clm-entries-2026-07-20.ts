// Lecture seule — inscrits É2/É3 + distances/checkpoints des deux CLM
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
  const prisma = new PrismaClient();
  for (const num of [2, 3]) {
    const stage = await prisma.stage.findFirst({
      where: { number: num },
      include: {
        checkpoints: { orderBy: { order: 'asc' } },
        entries: { include: { rider: { include: { team: true } } } },
      },
    });
    if (!stage) continue;
    console.log(`\n=== É${num} — ${stage.name} | type=${stage.type} | date=${stage.date.toISOString().slice(0, 10)} ===`);
    for (const c of stage.checkpoints) {
      console.log(`  checkpoint: ${c.type} | km=${c.kmFromStart} | ${c.name}`);
    }
    const names = stage.entries
      .map((e) => `${e.rider.firstName}${e.rider.team.slug === 'sans-equipe' ? ' (sans équipe)' : ''} [${e.status}]`)
      .sort();
    console.log(`  ${stage.entries.length} inscrits: ${names.join(', ')}`);
  }
  await prisma.$disconnect();
}

main();
