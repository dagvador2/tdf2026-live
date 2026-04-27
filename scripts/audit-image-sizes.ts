// HEAD chaque heroImageUrl + lit les dimensions via sharp.
// Liste les images sous MIN_WIDTH (susceptibles d'etre pixelisees en hero).
import { PrismaClient } from '@prisma/client';
import sharp from 'sharp';
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

const MIN_WIDTH = 600;

async function main() {
  const p = new PrismaClient();
  const stories = await p.tourStory.findMany({
    where: { heroImageUrl: { not: null } },
    select: { slug: true, heroImageUrl: true },
  });

  const small: { slug: string; w: number; h: number; bytes: number }[] = [];
  let ok = 0;
  for (const s of stories) {
    try {
      const r = await fetch(s.heroImageUrl!);
      const buf = Buffer.from(await r.arrayBuffer());
      const meta = await sharp(buf).metadata();
      const w = meta.width ?? 0;
      const h = meta.height ?? 0;
      if (w < MIN_WIDTH) {
        small.push({ slug: s.slug, w, h, bytes: buf.length });
      } else {
        ok++;
      }
    } catch (e) {
      console.log('  err', s.slug, (e as Error).message);
    }
  }

  console.log(`\nTotal: ${stories.length}`);
  console.log(`>= ${MIN_WIDTH}px wide: ${ok}`);
  console.log(`< ${MIN_WIDTH}px wide: ${small.length}`);
  console.log('\nImages a retraiter :');
  for (const s of small) console.log(`  ${s.slug.padEnd(48)} ${s.w}x${s.h} (${s.bytes}B)`);

  await p.$disconnect();
}
main();
