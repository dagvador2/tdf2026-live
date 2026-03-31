# CLAUDE.md — Instructions pour Claude Code

## Contexte du projet

Tu travailles sur **TDF 2026 Live Tracker**, une PWA de suivi en temps réel pour un Tour de France amateur entre amis. 35 participants, 4 équipes parodiques, 6 étapes dans les Alpes (20-26 juillet 2026). L'app permet aux spectateurs de suivre la course en live et aux coureurs de voir leurs écarts en temps sur leur téléphone fixé au guidon.

Le créateur du projet n'est pas développeur. Il travaille avec toi dans VS Code et peut lancer des commandes terminal. Tout le code est écrit par toi. L'app doit être maintenable à 100% par Claude Code.

## Documents de référence

1. **`docs/TDF2026_LiveApp_Spec_v3.md`** — Spec fonctionnelle et technique complète
2. **`docs/TDF2026_LiveApp_Annexes_v3.md`** — Direction artistique, guide setup, checklist
3. **`docs/TDF2026_LiveApp_Backlog_v3.md`** — 47 tickets atomiques P1.01 → P7.04
4. **`TESTING.md`** — Stratégie de test, cas unitaires, protocole terrain

## Stack technique

| Couche | Technologie |
|--------|------------|
| Framework | Next.js 14+ (App Router), TypeScript strict |
| UI | Tailwind CSS + shadcn/ui |
| ORM | **Prisma** (migrations, types auto-générés, client singleton) |
| Base de données | **PostgreSQL sur Railway** |
| Auth admins | **Auth.js (NextAuth) v5** — Credentials provider, session JWT |
| Auth coureurs | **JWT custom** (HS256, token dans l'URL) |
| Temps réel | **Server-Sent Events (SSE)** — natif, pas de lib externe |
| Storage fichiers | **Cloudflare R2** via AWS S3 SDK |
| Hosting | **Railway** (auto-deploy depuis GitHub) |
| Carte | MapLibre GL JS + MapTiler (free tier) |
| Graphiques | Recharts |
| Monitoring | Sentry (free tier) |
| Tests | Vitest (unit + integration), Playwright (E2E) |

## Comment travailler

### Ticket par ticket

1. L'utilisateur donne un numéro de ticket (ex: "P2.03")
2. Lis le ticket dans `docs/TDF2026_LiveApp_Backlog_v3.md`
3. Vérifie les dépendances
4. Code
5. Vérifie les critères d'acceptance
6. Commit : `[P2.03] Page liste des équipes`

### Règles de code

- **Code** : anglais (variables, fonctions, composants, commentaires)
- **UI** : français (tout le texte visible)
- Server Components par défaut, Client Components uniquement pour l'interactivité
- Pas de state manager global (Redux, Zustand) — Prisma + Server Components + hooks suffisent
- 1 ticket = 1 commit, l'app doit compiler après chaque commit
- Pas de `console.log` en production, pas de code mort

### Conventions de nommage

| Élément | Convention | Exemple |
|---------|-----------|---------|
| Composants React | PascalCase | `TeamCard.tsx` |
| Fichiers lib | camelCase | `haversine.ts` |
| Hooks | `use` + PascalCase | `useGPSTracker.ts` |
| Routes API | kebab-case | `api/gps/batch/route.ts` |
| Tables SQL (Prisma) | camelCase model, snake_case @@map | `model GpsPosition` → `@@map("gps_positions")` |

## Structure du repo

```
tdf2026-live/
├── prisma/
│   ├── schema.prisma          # Source de vérité du modèle de données
│   ├── migrations/            # Auto-générées par Prisma
│   └── seed.ts                # Données mock
├── src/
│   ├── app/                   # Next.js App Router (pages + API routes)
│   ├── components/            # Composants React organisés par domaine
│   ├── lib/
│   │   ├── db.ts              # Prisma client singleton
│   │   ├── auth/              # Auth.js config + JWT coureur
│   │   ├── gps/               # Tracker, buffer, sync, geofence
│   │   ├── gpx/               # Parser GPX, projection polyline
│   │   ├── time-gap/          # ⭐ Calcul écarts en temps
│   │   ├── sse/               # SSE Connection Manager
│   │   ├── storage/           # Client Cloudflare R2
│   │   ├── standings/         # Calcul classements
│   │   └── utils/             # Haversine, formatters, constantes
│   ├── hooks/                 # useGPSTracker, useSSE, useLivePositions...
│   ├── types/
│   └── __tests__/
├── scripts/                   # simulate-rider.ts, simulate-race.ts
├── public/                    # PWA manifest, icônes
├── docs/                      # Spec, annexes, backlog
├── CLAUDE.md
├── TESTING.md
└── e2e/
```

## Prisma — Commandes clés

```bash
npx prisma migrate dev --name <nom>   # Nouvelle migration (dev)
npx prisma migrate deploy             # Appliquer migrations (prod)
npx prisma generate                   # Régénérer le client
npx prisma studio                     # Dashboard visuel
npx prisma db seed                    # Lancer le seed
npx prisma db push                    # Push schema sans migration (prototypage)
```

Le client Prisma est un singleton dans `src/lib/db.ts` :
```typescript
import { PrismaClient } from '@prisma/client'
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }
export const prisma = globalForPrisma.prisma || new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

## SSE — Architecture

Le SSE Manager (`src/lib/sse/manager.ts`) est un singleton côté serveur :
- `Map<stageId, Set<ReadableStreamController>>`
- Quand un batch GPS est traité → `broadcast(stageId, snapshot)`
- Heartbeat toutes les 30 sec
- Endpoint : `GET /api/live/stream?stageId=xxx`

Types d'événements : `positions`, `checkpoint`, `feed`, `stage_status`

Côté client : hook `useSSE(url)` utilise `EventSource` (natif, auto-reconnexion).

## Cloudflare R2 — Upload

Client S3 dans `src/lib/storage/r2.ts` :
```typescript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
// Upload : PutObjectCommand → retourne l'URL publique
```

API route `/api/upload` : reçoit un fichier (FormData), upload vers R2, retourne l'URL.

## Direction artistique (résumé)

```
Primaire : Jaune Ricard #F2C200
Secondaire : Bleu Nuit #1B1F3B
Fond : Blanc Crème #FAF8F0
Texte : Noir #1A1A1A
Mode course : Fond #0D0D0D, chiffres #F2C200

Équipes : #F2C200 (Visma), #E8E0D0 (EAU), #0055A4 (Groupama), #E03C31 (INEOS)
```

Titres : Bebas Neue / Oswald. Corps : Inter / DM Sans. Chiffres : JetBrains Mono.

## Données du projet

### 4 équipes
| Nom | Couleur | Slug |
|-----|---------|------|
| Visma Lease a Ricard | `#F2C200` | `visma-lease-a-ricard` |
| EAU Team Pastis | `#E8E0D0` | `eau-team-pastis` |
| Groupama Fédération du Jaune | `#0055A4` | `groupama-federation-du-jaune` |
| INEOS Anisés | `#E03C31` | `ineos-anises` |

### 6 étapes
| # | Date | Nom | Type | Km | D+ |
|---|------|-----|------|-----|-----|
| 1 | 20/07 | Sortie accidentée | road | 75.5 | 969 |
| 2 | 21/07 | CLM par équipe | team_tt | 34.6 | 219 |
| 3 | 22/07 | CLM individuel | individual_tt | 32.5 | 174 |
| 4 | 23/07 | Col de la Croix de Fer | mountain | 100.8 | 2291 |
| 5 | 24/07 | Alpe d'Huez | mountain | 68.5 | 2171 |
| 6 | 25/07 | Lautaret + Sarennes | mountain | 68.3 | 2203 |

### Fun facts (11 questions)
```typescript
const FUN_FACT_FIELDS = [
  { key: 'coureur_tdf_2025', label: 'Coureur du Tour 2025 préféré' },
  { key: 'coureur_all_time', label: 'Coureur all time préféré' },
  { key: 'souvenir_tour', label: 'Souvenir du Tour le plus marquant' },
  { key: 'marque_velo_reve', label: 'Marque de vélo de rêve' },
  { key: 'col_prefere', label: 'Col préféré déjà fait' },
  { key: 'pire_souvenir_velo', label: 'Pire souvenir à vélo' },
  { key: 'meilleur_souvenir_velo', label: 'Meilleur souvenir à vélo' },
  { key: 'surnom_velo', label: 'Surnom de ton vélo' },
  { key: 'chanson_col', label: 'Chanson dans un col de l\'enfer' },
  { key: 'boisson_apres_3000m', label: 'Boisson après 3000m de D+' },
  { key: 'excuse_col', label: 'Excuse quand tu es cramé en col' },
] as const;
```

## Points d'attention

- **Écart en temps = KEY FEATURE** — module `lib/time-gap/` couverture > 90%
- **Geofencing = côté serveur uniquement** (pas côté client)
- **Les fichiers GPX couvrent le parcours complet** mais les checkpoints ne sont qu'aux points chronométrés (ex: pied du col → sommet)
- **SSE heartbeat** toutes les 30 sec (Railway peut couper les connexions inactives)
- **Prisma singleton** dans `src/lib/db.ts` — NE PAS créer de nouveau PrismaClient ailleurs
- **iOS** : l'app DOIT rester au premier plan pendant le tracking GPS

## Variables d'environnement

```env
DATABASE_URL=
NEXTAUTH_SECRET=
NEXTAUTH_URL=
JWT_SECRET=
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=
NEXT_PUBLIC_MAPTILER_KEY=
NEXT_PUBLIC_APP_URL=
```

## Commandes utiles

```bash
npm run dev                    # Dev local
npm run build                  # Build prod
npm run test                   # Tests unitaires (Vitest)
npm run test:watch             # Tests en mode watch
npm run test:integration       # Tests d'intégration
npm run test:e2e               # Tests E2E (Playwright)
npx prisma studio              # Dashboard DB visuel
npx prisma migrate dev         # Nouvelle migration
npx prisma db seed             # Seed données mock
npx ts-node scripts/simulate-rider.ts   # Simuler un coureur GPS
```

## Ne pas faire

- Pas de Redux, Zustand, ou state manager global
- Pas de Supabase (on utilise Railway + Prisma)
- Pas de Socket.io ou WebSocket (on utilise SSE)
- Pas de localStorage pour données critiques
- Pas de hardcode de couleurs (utiliser les variables CSS)
- Pas de `console.log` en production
- Pas de `.env.local` dans le repo (`.gitignore`)
- Pas de nouveau PrismaClient en dehors de `src/lib/db.ts`
