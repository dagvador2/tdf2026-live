// Publishes the V1 selection of 25 stories spread across categories.
// Idempotent: stories already published keep their publishedAt; stories
// outside the V1 list that were published are unpublished.
// Usage: npx tsx scripts/publish-v1-stories.ts
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

// 25 slugs balanced across the 9 categories. Genesis story comes first.
const V1_SLUGS = [
  // explication (3) — including the featured genesis story
  'avenement-tour-de-france-1903',
  'maillot-jaune-pourquoi-jaune',
  'champs-elysees-arrivee-mythique',
  // duel (3)
  'coppi-bartali-photo-gourde-1952',
  'anquetil-poulidor-puy-de-dome-1964',
  'lemond-fignon-8-secondes-1989',
  // exploit (3)
  'pantani-galibier-1998',
  'hinault-pau-nez-en-sang-1985',
  'charly-gaul-orage-1958',
  // drame (3)
  'tom-simpson-ventoux-1967',
  'beloki-chute-2003',
  'casartelli-portet-aspet-1995',
  // anecdote (2)
  'tour-cafes-1903',
  'christophe-fourche-cassee-1913',
  // controverse (2)
  'festina-1998',
  'armstrong-decheance-2012',
  // col (3)
  'mont-ventoux-geant-provence',
  'tourmalet-seigneur-pyrenees',
  'alpe-d-huez-cathedrale',
  // coureur (3)
  'eddy-merckx-cannibale-absolu',
  'marco-pantani-pirate',
  'jacques-anquetil-maitre',
  // victoire (3)
  'lemond-premier-americain-1986',
  'pogacar-vingegaard-nouvelle-ere',
  'indurain-cinq-tours-1991-1995',
];

async function main() {
  const p = new PrismaClient();

  if (V1_SLUGS.length !== 25) {
    console.error(`Expected 25 slugs, got ${V1_SLUGS.length}. Aborting.`);
    process.exit(1);
  }

  // Sanity check : tous les slugs existent en base ?
  const existing = await p.tourStory.findMany({
    where: { slug: { in: V1_SLUGS } },
    select: { slug: true },
  });
  const existingSet = new Set(existing.map((s) => s.slug));
  const missing = V1_SLUGS.filter((s) => !existingSet.has(s));
  if (missing.length) {
    console.error('Slugs introuvables en base :');
    missing.forEach((s) => console.error('  -', s));
    process.exit(1);
  }

  // 1. Publier toutes celles de la V1 qui ne le sont pas encore
  let published = 0;
  for (const slug of V1_SLUGS) {
    const result = await p.tourStory.updateMany({
      where: { slug, publishedAt: null },
      data: { publishedAt: new Date() },
    });
    if (result.count > 0) {
      published++;
      console.log('  + publié', slug);
    }
  }

  // 2. Depublier toutes les autres histoires publiees
  const unpublished = await p.tourStory.updateMany({
    where: { slug: { notIn: V1_SLUGS }, publishedAt: { not: null } },
    data: { publishedAt: null },
  });

  console.log(`\nPubliees nouvellement : ${published}`);
  console.log(`Depubliees (hors V1)  : ${unpublished.count}`);

  // 3. Etat final
  const finalCount = await p.tourStory.count({ where: { publishedAt: { not: null } } });
  console.log(`Total publiees : ${finalCount}`);

  await p.$disconnect();
}
main().catch(console.error);
