# NEW FEATURES — Nutrition, Histoires du Tour, Notifications Push
## Document de spécification pour Claude Code

> Ce document décrit 3 nouvelles features à ajouter à TDF 2026 Live Tracker :
> 1. **Nutrition** — Plan de repas + recettes à la demande (API Claude)
> 2. **Histoires du Tour** — Récits du vrai Tour de France (générés en batch, stockés en base)
> 3. **Notifications Push** — Web Push API pour alerter les utilisateurs (étape live, nouvelle histoire, etc.)

---

## Table des matières

1. [Setup commun — API Anthropic](#1-setup-commun--api-anthropic)
2. [Feature : Nutrition](#2-feature--nutrition)
3. [Feature : Histoires du Tour](#3-feature--histoires-du-tour)
4. [Feature : Notifications Push](#4-feature--notifications-push)
5. [Tickets de développement](#5-tickets-de-développement)
6. [Coûts et limites](#6-coûts-et-limites)
7. [Ordre d'implémentation recommandé](#7-ordre-dimplémentation-recommandé)

---

## 1. Setup commun — API Anthropic

### 1.1 SDK et configuration

Installer le SDK officiel Anthropic :

```bash
npm install @anthropic-ai/sdk
```

Créer un client wrapper réutilisable dans `src/lib/ai/anthropic.ts` :

```typescript
import Anthropic from "@anthropic-ai/sdk";

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export const MODEL = "claude-sonnet-4-5"; // ou claude-opus-4-7 pour les tâches complexes
```

### 1.2 Variables d'environnement

```env
# Anthropic API
ANTHROPIC_API_KEY=sk-ant-api03-...
```

### 1.3 Convention pour les appels LLM

- Toutes les routes API qui appellent Claude vont dans `src/app/api/ai/`
- Tous les prompts sont centralisés dans `src/lib/ai/prompts/` (un fichier par feature)
- On utilise toujours du **structured output** (JSON) pour les réponses, jamais du texte libre
- Les appels longs utilisent le **streaming** côté client (pas attendre 30 sec en silence)
- Les coûts sont monitorés (logs de chaque appel avec input/output tokens)

---

## 2. Feature : Nutrition

### 2.1 Concept

Deux modes complémentaires :

**Mode A — Plan de repas généré**
Le coureur reçoit un plan complet (petit-déj, déjeuner, en-cas, dîner) personnalisé selon :
- Son poids, sa FTP (déjà en base via le portail)
- L'étape du jour (km, D+, type)
- Son régime alimentaire (déclaré dans son profil)
- Ses contraintes (allergies, dégoûts)

**Mode B — Recettes à la demande**
Le coureur tape : "J'ai du riz, des œufs, du thon, des courgettes" → Claude propose 2-3 recettes adaptées à un cycliste pour le contexte donné (avant l'étape, récup, repas léger…).

Les deux modes sont accompagnés d'**explications pédagogiques** : pourquoi tel macronutriment, à quel moment, en quelle quantité. C'est éducatif, pas juste une liste de recettes.

### 2.2 Modifications du modèle Prisma

Ajouter au model `Rider` (déjà fait pour le portail, on étend) :

```prisma
model Rider {
  // ... champs existants ...

  // Nutrition
  diet              String?  // "omnivore" | "vegetarian" | "vegan" | "pescatarian" | "other"
  allergies         String?  // texte libre
  foodDislikes      String?  @map("food_dislikes") // texte libre
  nutritionGoal     String?  @map("nutrition_goal") // "performance" | "weight_loss" | "maintenance"
}

// Nouveau : on stocke les plans générés et les recettes consultées
model NutritionPlan {
  id        String   @id @default(cuid())
  riderId   String   @map("rider_id")
  rider     Rider    @relation(fields: [riderId], references: [id])
  stageId   String?  @map("stage_id")  // null si plan général
  stage     Stage?   @relation(fields: [stageId], references: [id])
  date      DateTime
  content   Json     // Plan complet en JSON structuré (voir section 2.5)
  createdAt DateTime @default(now()) @map("created_at")

  @@index([riderId, date])
  @@map("nutrition_plans")
}

model RecipeQuery {
  id          String   @id @default(cuid())
  riderId     String   @map("rider_id")
  rider       Rider    @relation(fields: [riderId], references: [id])
  ingredients String   // ce que le coureur a tapé
  context     String   // "pre_ride" | "post_ride" | "rest_day" | "during_ride"
  recipes     Json     // Réponse structurée
  createdAt   DateTime @default(now()) @map("created_at")

  @@map("recipe_queries")
}
```

### 2.3 Pages utilisateur

#### `/mon-espace/nutrition` — Dashboard nutrition

- **Profil nutritionnel** : régime, allergies, dégoûts, objectif (éditable)
- **Plan du jour** : si une étape est aujourd'hui ou demain → bouton "Générer mon plan"
- **Mes plans précédents** : historique des plans générés
- **Recettes à la demande** : champ texte + bouton

#### `/mon-espace/nutrition/plan/[id]` — Détail d'un plan

Affiche un plan complet sous forme de timeline :

```
🌅 PETIT-DÉJEUNER (2h avant le départ — 7h00)
   • Bol de flocons d'avoine au lait
   • 1 banane
   • 1 cuillère de miel
   • Café noir

   💡 Pourquoi ?
   À 2h du départ, tu as besoin d'amidons à digestion
   moyenne pour stocker du glycogène. L'avoine est
   parfait — index glycémique modéré, fibres pour
   éviter le pic d'insuline...

🚴 PENDANT L'ÉTAGE
   • Toutes les 30 min : 60g de glucides...

🍝 DÉJEUNER (post-étape immédiat)
   ...

🍽️ DÎNER
   ...
```

#### `/mon-espace/nutrition/recettes` — Page recettes à la demande

Formulaire :
- Textarea : "Qu'as-tu dans ton frigo ?"
- Select contexte : Avant l'étape / Pendant l'étape / Récup / Jour de repos
- Bouton "Générer 2-3 recettes"

Affichage du résultat avec streaming (les recettes apparaissent au fur et à mesure que Claude écrit).

### 2.4 API Routes

#### `POST /api/ai/nutrition/plan`

Body :
```json
{
  "stageId": "uuid",   // optionnel, pour personnaliser à l'étape
  "date": "2026-07-23"
}
```

Pipeline :
1. Récupérer le rider depuis la session
2. Récupérer les infos du rider (poids, FTP, régime, allergies, etc.)
3. Si `stageId` → récupérer infos étape (km, D+, type, heure de départ)
4. Construire le prompt système avec ces infos
5. Appeler Claude avec **structured output** (JSON)
6. Sauvegarder le plan en base
7. Retourner le plan

#### `POST /api/ai/nutrition/recipes`

Body :
```json
{
  "ingredients": "riz, œufs, thon, courgettes, oignon",
  "context": "post_ride"
}
```

Pipeline similaire mais avec **streaming** (Server-Sent Events ou ReadableStream) pour afficher la réponse au fur et à mesure.

### 2.5 Format JSON du plan de repas

```typescript
interface NutritionPlan {
  date: string;
  stage: { name: string; type: string; distanceKm: number; elevationM: number } | null;
  rider: { weightKg: number; ftpWatts: number };
  totalCalories: number;
  totalCarbs: number;
  totalProtein: number;
  totalFat: number;
  meals: Meal[];
}

interface Meal {
  type: "breakfast" | "during_ride" | "lunch" | "snack" | "dinner";
  time: string;          // "07:00"
  title: string;         // "Petit-déjeuner pré-étape"
  items: MealItem[];
  rationale: string;     // Explication pédagogique (3-5 phrases)
  macros: {
    calories: number;
    carbs: number;
    protein: number;
    fat: number;
  };
}

interface MealItem {
  food: string;          // "Flocons d'avoine"
  quantity: string;      // "80g"
  notes?: string;        // optionnel
}
```

### 2.6 Prompt système nutrition (extrait)

`src/lib/ai/prompts/nutrition.ts` :

```typescript
export const NUTRITION_PLAN_SYSTEM_PROMPT = `Tu es un nutritionniste sportif spécialisé dans le cyclisme d'endurance. 
Tu rédiges des plans de repas adaptés à des cyclistes amateurs qui font des étapes de montagne.

Règles :
- Tes recommandations sont basées sur des principes scientifiques de nutrition sportive
- Tu adaptes les quantités au poids et à la FTP du coureur
- Tu respectes les régimes alimentaires, allergies et dégoûts indiqués
- Tu inclus une explication pédagogique (rationale) pour CHAQUE repas — le coureur doit comprendre pourquoi tu recommandes ça
- Tu utilises des aliments courants et accessibles (pas de superaliments rares)
- Tu calcules les macros approximativement (pas besoin de précision absolue)

Format de réponse : JSON strict suivant le schéma fourni. Pas de texte avant ou après le JSON.`;
```

### 2.7 Streaming pour les recettes

```typescript
// src/app/api/ai/nutrition/recipes/route.ts
export async function POST(req: Request) {
  const { ingredients, context } = await req.json();
  const session = await auth();
  const rider = await prisma.rider.findUnique({ where: { user: { id: session.user.id } } });

  const stream = await anthropic.messages.stream({
    model: MODEL,
    max_tokens: 2000,
    system: RECIPE_SYSTEM_PROMPT,
    messages: [{
      role: "user",
      content: `Ingrédients : ${ingredients}\nContexte : ${context}\nProfil : ${JSON.stringify(rider)}`
    }],
  });

  const readableStream = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        if (chunk.type === "content_block_delta") {
          controller.enqueue(`data: ${JSON.stringify(chunk.delta)}\n\n`);
        }
      }
      controller.close();
    }
  });

  return new Response(readableStream, {
    headers: { "Content-Type": "text/event-stream" }
  });
}
```

---

## 3. Feature : Histoires du Tour

### 3.1 Concept

Une bibliothèque de **30-50 histoires** du vrai Tour de France, générées en batch par Claude une seule fois, stockées en base, puis publiées au rythme d'une histoire par jour ou par étape.

Exemples d'histoires possibles :
- L'attaque de Pantani au Galibier en 1998
- Le duel Anquetil-Poulidor au Puy-de-Dôme en 1964
- L'étape de Sestrières en 1992 (le coup de pédale de Chiappucci)
- LeMond vs Fignon, les 8 secondes de l'histoire (1989)
- L'arrivée d'Eddy Merckx au Mont Ventoux en 1970
- L'Alpe d'Huez et ses 21 lacets — histoire et records
- La chute de Beloki en 2003 et le passage par le champ d'Armstrong
- Le sprint d'André Greipel sur les Champs-Élysées
- La tragédie de Tom Simpson sur le Ventoux en 1967
- Le maillot jaune de Lance Armstrong (et sa déchéance)

L'objectif : un contenu **agréable à lire** sur le téléphone, façon longread court (~500-800 mots), avec une accroche, du contexte, le récit de l'événement, et une conclusion.

### 3.2 Modifications du modèle Prisma

```prisma
model TourStory {
  id            String    @id @default(cuid())
  slug          String    @unique
  title         String
  subtitle      String?
  year          Int       // Année de l'événement
  category      String    // "duel" | "drame" | "exploit" | "anecdote" | "controverse" | "victoire"
  heroImageUrl  String?   @map("hero_image_url")
  excerpt       String    // ~150 caractères, accroche pour le feed
  content       String    @db.Text // Markdown
  readingTimeMin Int      @map("reading_time_min")
  publishedAt   DateTime? @map("published_at") // null = pas encore publié
  scheduledFor  DateTime? @map("scheduled_for") // Date prévue de publication
  createdAt     DateTime  @default(now()) @map("created_at")

  @@index([publishedAt])
  @@map("tour_stories")
}
```

### 3.3 Pages utilisateur

#### `/histoires` — Page liste publique

- Grille de cartes : image hero (placeholder ou récupérée), titre, sous-titre, année, badge catégorie
- Filtres : par catégorie, par décennie
- Tri : plus récent / plus ancien / plus lu
- Indicateur "Nouveau" sur les histoires publiées dans les 24h

#### `/histoires/[slug]` — Page lecture

- Hero image en haut
- Titre + sous-titre + métadonnées (année, catégorie, temps de lecture)
- Contenu en markdown (rendu propre avec typo lecture)
- Largeur max : ~700px (lisibilité optimale)
- Bouton partage WhatsApp en fin de lecture
- Suggestion de 3 autres histoires en bas

#### `/admin/histoires` — Admin

Tableau avec :
- Toutes les histoires en base
- Statut : Brouillon / Programmée / Publiée
- Actions : éditer, supprimer, publier maintenant, programmer

Bouton **"Générer un lot d'histoires"** qui lance le script de génération batch.

### 3.4 Génération en batch

Script à lancer une fois (ou plusieurs si on veut enrichir le catalogue) :

```typescript
// scripts/generate-tour-stories.ts

const TOPICS = [
  { title: "L'attaque de Pantani au Galibier", year: 1998, category: "exploit" },
  { title: "Le duel Anquetil-Poulidor au Puy-de-Dôme", year: 1964, category: "duel" },
  { title: "LeMond vs Fignon, 8 secondes", year: 1989, category: "drame" },
  { title: "Tom Simpson sur le Ventoux", year: 1967, category: "drame" },
  // ... 30-50 sujets pré-définis
];

for (const topic of TOPICS) {
  const story = await generateStory(topic);
  await prisma.tourStory.create({ data: story });
  console.log(`✅ ${topic.title}`);
  await sleep(1000); // rate limit Anthropic
}
```

### 3.5 Prompt système pour les histoires

```typescript
export const TOUR_STORY_SYSTEM_PROMPT = `Tu es un journaliste sportif passionné par l'histoire du Tour de France.
Tu écris des récits courts (500-800 mots) sur des événements réels du Tour, dans un style narratif et immersif.

Règles :
- Tu te bases UNIQUEMENT sur des événements RÉELS et VÉRIFIÉS du Tour de France
- Si tu n'es pas sûr d'un détail, tu restes vague plutôt que d'inventer
- Tu écris en français, dans un style fluide et accessible
- Tu structures ton récit : accroche → contexte → action → conclusion / héritage
- Tu évites le jargon trop technique
- Tu fais ressentir l'émotion du moment

Format de réponse : JSON strict avec les champs title, subtitle, excerpt, content (markdown), category, year, readingTimeMin.`;
```

### 3.6 Génération assistée (option future)

Pour la v2, on peut imaginer un mode où l'admin clique "Génère une histoire sur X" et l'IA crée à la demande. Pour l'instant, on reste sur le batch one-shot.

---

## 4. Feature : Notifications Push

### 4.1 Concept

Notifications **Web Push API** pour alerter les utilisateurs en dehors de l'app :
- Une étape démarre → push aux coureurs inscrits + spectateurs
- Une nouvelle histoire est publiée → push à tous
- L'admin poste dans le fil d'actu (mode "important") → push à tous
- Un coureur est tagué dans une histoire → push à lui

### 4.2 Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Côté client                            │
│                                                          │
│  1. L'utilisateur clique "Activer les notifs"            │
│  2. Le navigateur demande permission                     │
│  3. Si OK : on s'abonne via le Service Worker           │
│  4. On reçoit un endpoint + clés (subscription)         │
│  5. On envoie le subscription au serveur                 │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                    Côté serveur                          │
│                                                          │
│  1. On stocke le subscription en base (lié à l'user)    │
│  2. Quand un événement se produit (ex: nouvelle étape)  │
│  3. On itère sur les subscriptions concernées            │
│  4. On envoie via web-push (lib npm)                     │
│  5. Le serveur push envoie au navigateur du client       │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│              Côté client (Service Worker)                │
│                                                          │
│  1. Le SW reçoit l'event "push"                          │
│  2. Il affiche une notification système                  │
│  3. Au clic : ouvre l'app sur l'URL ciblée               │
└─────────────────────────────────────────────────────────┘
```

### 4.3 Modifications du modèle Prisma

```prisma
model PushSubscription {
  id           String   @id @default(cuid())
  userId       String   @map("user_id")
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  endpoint     String   @unique
  p256dh       String   // Clé publique
  auth         String   // Auth secret
  userAgent    String?  @map("user_agent")
  createdAt    DateTime @default(now()) @map("created_at")
  lastUsedAt   DateTime @default(now()) @map("last_used_at")

  @@index([userId])
  @@map("push_subscriptions")
}

// Préférences de notifications par utilisateur
model NotificationPreference {
  id                String   @id @default(cuid())
  userId            String   @unique @map("user_id")
  user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  stageStart        Boolean  @default(true) @map("stage_start")
  newStory          Boolean  @default(true) @map("new_story")
  feedHighlights    Boolean  @default(true) @map("feed_highlights")
  myResults         Boolean  @default(true) @map("my_results")

  @@map("notification_preferences")
}
```

### 4.4 Setup VAPID

VAPID = clés cryptographiques pour s'authentifier auprès des serveurs push (Google FCM, Mozilla, etc.). Gratuit, à générer une fois.

```bash
npx web-push generate-vapid-keys
```

Ajouter les clés en env :

```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BN...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:admin@tdf2026.fr
```

### 4.5 Service Worker — Gestion des push

Le Service Worker existe déjà (PWA). On lui ajoute la gestion des push :

```javascript
// public/sw.js (ou généré par next-pwa)

self.addEventListener('push', function(event) {
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    image: data.image,
    data: { url: data.url },
    actions: data.actions || [],
    vibrate: [200, 100, 200],
  };
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  );
});
```

### 4.6 Pages utilisateur

#### `/mon-espace/notifications` — Préférences

Toggle pour chaque type de notification :
- Étape qui démarre
- Nouvelles histoires publiées
- Moments forts du fil d'actu
- Mes résultats personnels

Bouton "Activer les notifications" si pas encore fait (déclenche le prompt de permission).

#### Banner d'incitation

Sur la page d'accueil, après 2-3 visites : banner discret "Active les notifs pour ne rien rater du Tour".

### 4.7 API Routes

#### `POST /api/notifications/subscribe`

Body : `{ endpoint, keys: { p256dh, auth } }`

Stocke le subscription en base, lié à l'user authentifié.

#### `DELETE /api/notifications/unsubscribe`

Supprime le subscription.

#### `POST /api/notifications/preferences`

Met à jour les préférences de l'user.

#### `POST /api/admin/notifications/send`

(Admin uniquement) Envoie une notification à tous les users abonnés selon des critères :

```json
{
  "type": "new_story",
  "title": "Nouvelle histoire : L'attaque de Pantani au Galibier",
  "body": "Découvre ce moment légendaire du Tour 1998",
  "url": "/histoires/pantani-galibier-1998",
  "audience": "all" | "riders" | "spectators",
  "stageId": "uuid"  // optionnel, pour cibler les inscrits à une étape
}
```

### 4.8 Triggers automatiques

| Événement | Déclencheur | Audience | Type |
|-----------|------------|----------|------|
| Étape démarre | Admin clique "Démarrer" | Coureurs inscrits + spectateurs | `stage_start` |
| Nouvelle histoire publiée | Admin clique "Publier" | Tous | `new_story` |
| Post important fil actu | Admin coche "Important" | Tous | `feed_highlights` |
| Résultat d'étape validé | Admin valide | Coureur concerné | `my_results` |

Pour chaque trigger : on filtre les `PushSubscription` selon les `NotificationPreference` de l'user, puis on envoie via `web-push`.

---

## 5. Tickets de développement

### Bloc A — Setup commun (3 tickets)

#### [AI.01] Setup SDK Anthropic
- Installer `@anthropic-ai/sdk`
- Créer `src/lib/ai/anthropic.ts` (client wrapper)
- Ajouter `ANTHROPIC_API_KEY` aux variables d'env
- Créer la structure `src/lib/ai/prompts/` (dossier vide pour les prompts à venir)

#### [AI.02] Helper structured output JSON
- Créer `src/lib/ai/structured.ts` avec une fonction `callClaudeJSON<T>(systemPrompt, userPrompt, schema)`
- Validation Zod du JSON retourné
- Retry automatique si le JSON est invalide
- Logs des tokens consommés (input + output)

#### [AI.03] Helper streaming
- Créer `src/lib/ai/streaming.ts` avec une fonction qui retourne un ReadableStream pour streaming SSE
- Hook côté client `useStreamingResponse` pour consommer le stream

### Bloc B — Nutrition (8 tickets)

#### [NUT.01] Migration Prisma — Champs nutrition sur Rider + tables NutritionPlan / RecipeQuery
- Ajouter `diet`, `allergies`, `foodDislikes`, `nutritionGoal` sur Rider
- Créer NutritionPlan et RecipeQuery
- Migration Prisma

#### [NUT.02] Mise à jour formulaire profil coureur
- Ajouter section "Nutrition" dans `/mon-espace/profil`
- Champs : régime, allergies, dégoûts, objectif

#### [NUT.03] Prompts nutrition
- Créer `src/lib/ai/prompts/nutrition.ts`
- Prompt système plan de repas
- Prompt système recettes
- Schéma JSON Zod pour le plan

#### [NUT.04] API route — Génération de plan
- `POST /api/ai/nutrition/plan`
- Récupère rider + étape, construit le prompt, appelle Claude (JSON)
- Sauvegarde dans NutritionPlan
- Retourne le plan

#### [NUT.05] API route — Recettes streaming
- `POST /api/ai/nutrition/recipes`
- Streaming SSE
- Sauvegarde dans RecipeQuery (après stream complet)

#### [NUT.06] Page dashboard nutrition coureur
- `/mon-espace/nutrition` avec sections : profil, plan du jour, historique, recettes

#### [NUT.07] Page détail d'un plan
- `/mon-espace/nutrition/plan/[id]`
- Rendu timeline des repas avec rationales pédagogiques

#### [NUT.08] Page recettes à la demande
- `/mon-espace/nutrition/recettes`
- Formulaire + affichage streaming

### Bloc C — Histoires du Tour (6 tickets)

#### [STO.01] Migration Prisma — TourStory
- Créer le model TourStory
- Migration Prisma

#### [STO.02] Liste des sujets d'histoires
- Créer `src/lib/ai/prompts/tour-stories.ts`
- Liste de 30-50 sujets pré-définis (titre, année, catégorie)
- Prompt système pour la génération

#### [STO.03] Script de génération en batch
- `scripts/generate-tour-stories.ts`
- Itère sur la liste, appelle Claude pour chaque sujet
- Insère en base avec `publishedAt: null`
- Progress logs

#### [STO.04] Page liste publique
- `/histoires` avec grille, filtres, tri

#### [STO.05] Page lecture d'une histoire
- `/histoires/[slug]` avec rendu markdown
- Suggestions en bas
- Bouton partage WhatsApp

#### [STO.06] Admin — Gestion des histoires
- `/admin/histoires` avec tableau, actions (publier, programmer, supprimer)
- Bouton "Générer un nouveau lot"

### Bloc D — Notifications Push (6 tickets)

#### [PUSH.01] Setup VAPID + migration Prisma
- Générer les clés VAPID
- Ajouter aux env
- Créer PushSubscription et NotificationPreference

#### [PUSH.02] Service Worker — Gestion des push
- Modifier `public/sw.js` pour gérer `push` et `notificationclick`
- Tester localement avec un push manuel

#### [PUSH.03] Hook côté client `usePushSubscription`
- Demande de permission, abonnement, désabonnement
- Envoi au serveur via API

#### [PUSH.04] API routes notifications
- `POST /api/notifications/subscribe`
- `DELETE /api/notifications/unsubscribe`
- `POST /api/notifications/preferences`
- `POST /api/admin/notifications/send`

#### [PUSH.05] Page préférences notifications
- `/mon-espace/notifications`
- Toggles pour chaque type
- Bouton "Activer les notifications"

#### [PUSH.06] Triggers automatiques
- Hook dans le contrôle d'étape (admin clique "Démarrer" → push)
- Hook dans la publication d'une histoire
- Hook dans la publication d'un post fil actu "important"
- Hook dans la validation des résultats

---

## 6. Coûts et limites

### 6.1 API Anthropic — Estimation

**Plan de repas** (input ~500 tokens, output ~1500 tokens) :
- Claude Sonnet 4.5 : ~$0.025 par plan
- Si 35 coureurs × 6 étapes = 210 plans → ~$5

**Recettes à la demande** (input ~300 tokens, output ~800 tokens) :
- Claude Sonnet 4.5 : ~$0.015 par requête
- Si 35 coureurs × 5 requêtes = 175 requêtes → ~$3

**Histoires du Tour** (input ~200 tokens, output ~1500 tokens) :
- Claude Sonnet 4.5 : ~$0.025 par histoire
- 50 histoires → ~$1.50

**Total estimé pour tout le voyage : ~$10-15 d'API Anthropic.**

Tu peux mettre une limite de budget dans la console Anthropic pour être tranquille.

### 6.2 Notifications Push — Coût

**Gratuit**. La Web Push API utilise les serveurs des navigateurs (Google FCM, Mozilla, Apple) qui sont gratuits. Le seul coût c'est le serveur Node.js qui envoie les push (déjà en place sur Railway).

### 6.3 Limites techniques

**iOS** : les notifications push PWA fonctionnent **uniquement** si l'app est installée sur l'écran d'accueil (depuis iOS 16.4). Sinon → silence radio. Important de bien communiquer aux utilisateurs : "Installe l'app pour recevoir les notifs".

**Volume** : la lib `web-push` peut envoyer ~1000 notifs/seconde sur un serveur classique. Largement suffisant pour 200 abonnés.

**Persistance** : si un user a désinstallé l'app ou bloqué les notifs, le push échoue. On nettoie périodiquement les subscriptions invalides (suppression auto au bout de 3 échecs consécutifs).

---

## 7. Ordre d'implémentation recommandé

### Étape 1 — Setup commun
Faire `AI.01`, `AI.02`, `AI.03` en premier. Ça pose les fondations pour les deux features qui appellent Claude.

### Étape 2 — Histoires du Tour (rapide)
Faire le bloc C complet. C'est la feature la plus simple : pas d'interaction temps réel, juste de la lecture. Ça crée du contenu dans l'app que les utilisateurs peuvent découvrir avant le voyage.

### Étape 3 — Notifications Push (moyen)
Faire le bloc D. Indépendant des autres features, peut être fait en parallèle. Une fois en place, on peut l'utiliser pour annoncer la sortie des histoires.

### Étape 4 — Nutrition (le plus gros)
Faire le bloc B en dernier. C'est la feature la plus interactive (deux modes, streaming, historique). Idéal de la lancer quand les utilisateurs sont déjà engagés sur l'app.

---

## 8. Variables d'environnement à ajouter

```env
# Anthropic API
ANTHROPIC_API_KEY=sk-ant-api03-...

# Web Push (à générer avec: npx web-push generate-vapid-keys)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:ton@email.com
```

---

## 9. Prompt à donner à Claude Code

Voici le prompt à coller pour lancer l'implémentation :

```
On ajoute 3 nouvelles features à l'app : nutrition, histoires du Tour, et notifications push.

Lis le document docs/NEW_FEATURES_NUTRITION_STORIES_PUSH.md qui décrit tout en détail.

Enchaîne les tickets dans l'ordre suivant :

BLOC A — Setup commun :
AI.01 Setup SDK Anthropic
AI.02 Helper structured output JSON
AI.03 Helper streaming

BLOC C — Histoires du Tour (priorité 1, plus simple) :
STO.01 → STO.06

BLOC D — Notifications Push :
PUSH.01 → PUSH.06

BLOC B — Nutrition (en dernier, plus complexe) :
NUT.01 → NUT.08

Commit atomique à chaque ticket.

AVANT de commencer, demande-moi :
1. La clé ANTHROPIC_API_KEY (je vais la créer si je ne l'ai pas)
2. Si je veux que tu génères les clés VAPID maintenant ou plus tard
3. La liste des 30-50 sujets d'histoires du Tour (je peux te dire si tu peux la générer toi-même ou si tu dois en proposer)

Sinon, enchaîne.
```
