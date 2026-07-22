# 51 Histoires du Tour de France — Prêtes à importer

Ce dossier contient 51 histoires complètes du Tour de France, rédigées en français, prêtes à être importées dans la base de données via Prisma.

## Contenu

- **`tour_stories_50.json`** : Le fichier principal avec les 51 histoires (213 Ko)
- **`seed-tour-stories.ts`** : Script TypeScript pour importer le JSON en base

## Statistiques

- **Total : 51 histoires** (le plan en prévoyait 50, j'en ai fait une de plus)
- **Temps de lecture total : 240 minutes** (4 heures de contenu)
- **Temps moyen par histoire : 4,7 minutes** (dans la fourchette 3-7 min demandée)

### Répartition par catégorie

| Catégorie | Nombre |
|-----------|--------|
| Exploit | 13 |
| Victoire | 10 |
| Drame | 8 |
| Duel | 7 |
| Anecdote | 7 |
| Controverse | 6 |

### Répartition par décennie

| Décennie | Histoires |
|----------|-----------|
| 1900s | 1 |
| 1910s | 3 |
| 1930s | 1 |
| 1940s | 2 |
| 1950s | 8 |
| 1960s | 4 |
| 1970s | 2 |
| 1980s | 6 |
| 1990s | 10 |
| 2000s | 7 |
| 2010s | 5 |
| 2020s | 2 |

Couverture complète de l'histoire du Tour, de 1903 (création) à 2020 (Pogačar).

## Comment utiliser dans Claude Code

### 1. Place les fichiers dans le repo

```bash
# Crée un dossier data
mkdir -p data
mkdir -p scripts

# Copie les fichiers
cp tour_stories_50.json ./data/
cp seed-tour-stories.ts ./scripts/
```

### 2. Vérifie que la table `TourStory` existe

Le ticket STO.01 doit avoir été fait. Ton schema Prisma doit contenir le model TourStory avec ces champs :

```prisma
model TourStory {
  id            String    @id @default(cuid())
  slug          String    @unique
  title         String
  subtitle      String?
  year          Int
  category      String
  heroImageUrl  String?   @map("hero_image_url")
  excerpt       String
  content       String    @db.Text
  readingTimeMin Int      @map("reading_time_min")
  publishedAt   DateTime? @map("published_at")
  scheduledFor  DateTime? @map("scheduled_for")
  createdAt     DateTime  @default(now()) @map("created_at")

  @@index([publishedAt])
  @@map("tour_stories")
}
```

### 3. Lance le script d'import

```bash
npx ts-node scripts/seed-tour-stories.ts
```

Le script utilise `upsert` donc tu peux le relancer plusieurs fois sans créer de doublons.

### 4. Vérifie en base

```bash
npx prisma studio
```

Tu devrais voir 51 entrées dans la table `tour_stories`, toutes avec `publishedAt: null`.

### 5. Publie les histoires

Deux options :

**Option A — Publication immédiate** : Aller dans `/admin/histoires` et publier toutes les histoires en un clic (à implémenter dans le ticket STO.06).

**Option B — Publication programmée** : Programmer une histoire par jour pour faire vivre le contenu sur plusieurs semaines. Tu peux aussi mettre toutes les histoires dans `scheduledFor` à des dates différentes.

```typescript
// Exemple : publier 1 histoire par jour à partir de demain
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);

const stories = await prisma.tourStory.findMany({
  where: { publishedAt: null }
});

for (let i = 0; i < stories.length; i++) {
  const publishDate = new Date(tomorrow);
  publishDate.setDate(publishDate.getDate() + i);
  await prisma.tourStory.update({
    where: { id: stories[i].id },
    data: { scheduledFor: publishDate }
  });
}
```

## Format du JSON

Chaque histoire suit ce schéma :

```typescript
{
  "slug": "anquetil-poulidor-puy-de-dome-1964",
  "title": "Anquetil vs Poulidor au Puy-de-Dôme",
  "subtitle": "L'image éternelle du sport français",
  "year": 1964,
  "category": "duel",  // duel | drame | exploit | anecdote | controverse | victoire
  "excerpt": "...",     // ~150 caractères pour le feed
  "readingTimeMin": 5,
  "content": "..."      // Markdown avec sections (##), 500-1500 mots
}
```

## Notes éditoriales

- Toutes les histoires sont basées sur des **événements réels** du Tour de France
- Quelques détails secondaires peuvent contenir de petites imprécisions (par exemple sur des dialogues exacts qui sont reconstitués), mais les faits principaux sont vérifiés
- Le ton est journalistique et narratif, accessible au grand public
- Les controverses (dopage, etc.) sont traitées factuellement, sans complaisance ni jugement excessif
- Les héros français (Hinault, Anquetil, Bobet, Robic) ont une représentation appropriée
- Les femmes ne sont pas représentées car le Tour de France féminin moderne (Tour de France Femmes) n'a démarré qu'en 2022 — cela peut être ajouté en V2 si tu veux étendre le contenu

## Idées d'extension future

Si tu veux ajouter du contenu plus tard, voici des sujets non couverts qui pourraient enrichir le catalogue :

- L'histoire des cols mythiques (Tourmalet, Aubisque, Galibier, Mont Ventoux dédié, etc.)
- Les femmes pionnières (Marianne Martin 1984, le Tour de France féminin actuel)
- Les frères célèbres (Schleck, Yates, Pélissier)
- Les coureurs maudits qui n'ont jamais gagné (Poulidor, Zoetemelk avant 1980, etc.)
- Les sprinteurs légendaires (Cipollini, Petacchi, Sagan)
- Les arrivées mythiques par décennie

Mais pour 51 histoires d'un Tour amateur entre amis, c'est largement suffisant pour faire vivre l'app pendant des mois.
