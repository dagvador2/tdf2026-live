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
    where: { OR: [{ slug: { contains: 'hinault' } }, { slug: { contains: 'blaireau' } }] },
    select: { slug: true, title: true, heroImageUrl: true, heroImageAttribution: true },
  });
  for (const s of stories) console.log(JSON.stringify(s, null, 2));
  await p.$disconnect();
}
main();
