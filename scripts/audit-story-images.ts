// Audits all hero image URLs in DB: HEAD each one, check Content-Type.
// Prints slugs whose Content-Type is not image/* (likely broken).
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

  let ok = 0;
  const broken: { slug: string; ct: string; size: number }[] = [];

  for (const s of stories) {
    try {
      const r = await fetch(s.heroImageUrl!, { method: 'HEAD' });
      const ct = r.headers.get('content-type') ?? '';
      const size = Number(r.headers.get('content-length') ?? '0');
      if (!ct.startsWith('image/')) {
        broken.push({ slug: s.slug, ct, size });
      } else {
        ok++;
      }
    } catch (e) {
      broken.push({ slug: s.slug, ct: `ERR ${(e as Error).message}`, size: 0 });
    }
  }

  console.log(`Total with heroImageUrl: ${stories.length}`);
  console.log(`Real images: ${ok}`);
  console.log(`Broken (non-image content-type): ${broken.length}`);
  console.log('');
  for (const b of broken) console.log(`  ${b.slug.padEnd(48)} ${b.ct} (${b.size}B)`);

  await p.$disconnect();
}
main();
