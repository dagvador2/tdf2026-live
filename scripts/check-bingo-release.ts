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
  const migrations = await p.$queryRawUnsafe<{ migration_name: string }[]>(
    `SELECT migration_name FROM "_prisma_migrations" WHERE migration_name ILIKE '%bingo%' OR migration_name ILIKE '%grid%' ORDER BY finished_at`
  );
  console.log('Migrations bingo appliquées en prod:', migrations.map((m) => m.migration_name));
  const templates = await p.bingoCellTemplate.count();
  console.log('Templates de cases bingo en prod:', templates);
  const events = await p.bingoEvent.findMany();
  console.log('Événements bingo:', events);
  const grids = await p.bingoGrid.findMany({
    select: {
      generatedAt: true,
      revealedAt: true,
      user: { select: { email: true, name: true } },
    },
    orderBy: { generatedAt: 'asc' },
  });
  console.log(`Grilles (${grids.length}):`);
  for (const g of grids) {
    console.log(
      `  ${g.user?.email ?? '?'} | générée ${g.generatedAt.toISOString().slice(0, 16)} | révélée: ${g.revealedAt ? g.revealedAt.toISOString().slice(0, 16) : 'non'}`
    );
  }
  await p.$disconnect();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
