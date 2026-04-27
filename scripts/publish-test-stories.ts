// Publishes 5 test stories (one per main category) for UI testing.
// Usage: npx tsx scripts/publish-test-stories.ts
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

const TEST_SLUGS = [
  'coppi-bartali-photo-gourde-1952',
  'pantani-galibier-1998',
  'tom-simpson-ventoux-1967',
  'mont-ventoux-geant-provence',
  'eddy-merckx-cannibale-absolu',
];

async function main() {
  const p = new PrismaClient();
  for (const slug of TEST_SLUGS) {
    const r = await p.tourStory.update({
      where: { slug },
      data: { publishedAt: new Date() },
    });
    console.log('  ✓', r.title);
  }
  await p.$disconnect();
}
main().catch(console.error);
