// HEAD chaque heroImageUrl, NULL ceux dont content-type n'est pas image/*.
// Permet a la page liste de fallback sur le gradient en attendant le retry.
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
  const stories = await p.tourStory.findMany({
    where: { heroImageUrl: { not: null } },
    select: { slug: true, heroImageUrl: true },
  });

  let cleared = 0;
  for (const s of stories) {
    try {
      const r = await fetch(s.heroImageUrl!, { method: 'HEAD' });
      const ct = r.headers.get('content-type') ?? '';
      if (!ct.startsWith('image/')) {
        await p.tourStory.update({
          where: { slug: s.slug },
          data: { heroImageUrl: null, heroImageAttribution: null },
        });
        cleared++;
        console.log(`  cleared ${s.slug}  (${ct})`);
      }
    } catch (e) {
      console.log(`  err ${s.slug}: ${(e as Error).message}`);
    }
  }
  console.log(`\nCleared ${cleared} broken heroImageUrl values.`);
  await p.$disconnect();
}
main();
