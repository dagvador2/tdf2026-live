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
  const events = await p.storyViewEvent.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: { story: { select: { slug: true } } },
  });
  for (const e of events) {
    console.log(`${e.createdAt.toISOString()}  ${e.kind.padEnd(5)}  ${e.story.slug.padEnd(40)}  user=${e.userId ?? '-'}  session=${e.sessionId ?? '-'}`);
  }
  console.log('total:', await p.storyViewEvent.count());
  await p.$disconnect();
}
main();
