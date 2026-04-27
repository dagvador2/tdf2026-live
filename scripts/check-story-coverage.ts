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
  const total = await p.tourStory.count();
  const withImg = await p.tourStory.count({ where: { heroImageUrl: { not: null } } });
  const missing = await p.tourStory.findMany({ where: { heroImageUrl: null }, select: { slug: true } });
  console.log('total:', total, '| with image:', withImg, '| missing:', total - withImg);
  if (missing.length) {
    console.log('Missing slugs:');
    missing.forEach((m) => console.log(' -', m.slug));
  }
  await p.$disconnect();
}
main();
