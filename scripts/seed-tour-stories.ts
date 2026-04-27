// scripts/seed-tour-stories.ts
// Script a lancer une fois pour importer les 75 histoires en base
// Usage: npm run tour-stories:seed

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface Story {
  slug: string;
  title: string;
  subtitle: string;
  year: number;
  category: string;
  excerpt: string;
  readingTimeMin: number;
  content: string;
}

async function main() {
  console.log('📖 Import des histoires du Tour...\n');

  // Charger le JSON
  const filePath = path.join(process.cwd(), 'data', 'tour_stories_75.json');
  const rawData = fs.readFileSync(filePath, 'utf-8');
  const stories: Story[] = JSON.parse(rawData);

  console.log(`✅ ${stories.length} histoires chargées depuis ${filePath}\n`);

  let created = 0;
  let updated = 0;
  let errors = 0;

  for (const story of stories) {
    try {
      const result = await prisma.tourStory.upsert({
        where: { slug: story.slug },
        update: {
          title: story.title,
          subtitle: story.subtitle,
          year: story.year,
          category: story.category,
          excerpt: story.excerpt,
          content: story.content,
          readingTimeMin: story.readingTimeMin,
        },
        create: {
          slug: story.slug,
          title: story.title,
          subtitle: story.subtitle,
          year: story.year,
          category: story.category,
          excerpt: story.excerpt,
          content: story.content,
          readingTimeMin: story.readingTimeMin,
          // publishedAt: null par défaut → l'admin publie ensuite manuellement
          // ou on peut programmer une publication automatique
        },
      });

      if (result.createdAt.getTime() === result.createdAt.getTime()) {
        // Pour distinguer create vs update, on regarde si createdAt et updatedAt sont identiques
        // (mais Prisma ne fournit pas cette info directement avec upsert)
        // Simplification : on compte juste les succès
      }

      created++;
      console.log(`  ✓ [${story.category.padEnd(11)}] ${story.year} — ${story.title}`);
    } catch (error) {
      errors++;
      console.error(`  ✗ Erreur pour "${story.slug}":`, error);
    }
  }

  console.log(`\n📊 Résumé :`);
  console.log(`  - Histoires importées : ${created}/${stories.length}`);
  console.log(`  - Erreurs : ${errors}`);

  // Statistiques par catégorie
  console.log(`\n📈 Répartition par catégorie :`);
  const counts = await prisma.tourStory.groupBy({
    by: ['category'],
    _count: true,
  });
  for (const c of counts) {
    console.log(`  - ${c.category}: ${c._count}`);
  }

  console.log(`\n🎉 Import terminé !`);
  console.log(`\n💡 Prochaine étape : aller dans /admin/histoires pour publier les histoires`);
  console.log(`   ou lancer le script de publication automatique.`);
}

main()
  .catch((e) => {
    console.error('❌ Erreur fatale:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
