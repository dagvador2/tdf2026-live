# TDF 2026 — Live Tracker & Hub
## Document de spécification technique — v3.0

> **Objectif** : Application web (PWA) permettant aux spectateurs de suivre en live le Tour de France amateur 2026 (6 étapes, ~35 participants, 4 équipes), et aux coureurs de tracker leur position GPS en temps réel avec calcul d'écarts en temps.

> **Langue** : Interface 100% français. Code et documentation technique en anglais.

> **Contrainte technique** : Le créateur de l'app n'est pas développeur mais peut lancer des commandes terminal via Claude Code dans VS Code. L'application doit être intégralement développable et maintenable via Claude Code. L'infra s'appuie sur Railway (déjà utilisé pour un autre projet) et Cloudflare R2 (déjà en place).

---

## Table des matières

1. [Vue d'ensemble du produit](#1-vue-densemble-du-produit)
2. [Utilisateurs & rôles](#2-utilisateurs--rôles)
3. [Fonctionnalités détaillées](#3-fonctionnalités-détaillées)
4. [Modèle de données](#4-modèle-de-données)
5. [Architecture technique](#5-architecture-technique)
6. [Stack technologique](#6-stack-technologique)
7. [Tracking GPS — Spécification détaillée](#7-tracking-gps--spécification-détaillée)
8. [Calcul des écarts en temps — Key Feature](#8-calcul-des-écarts-en-temps--key-feature)
9. [Temps réel — Server-Sent Events (SSE)](#9-temps-réel--server-sent-events-sse)
10. [Gestion offline & sync](#10-gestion-offline--sync)
11. [Mode Replay](#11-mode-replay)
12. [Fil d'actualité live](#12-fil-dactualité-live)
13. [Sécurité & authentification](#13-sécurité--authentification)
14. [Infrastructure & déploiement](#14-infrastructure--déploiement)
15. [Performance & limites](#15-performance--limites)
16. [Phases de développement](#16-phases-de-développement)
17. [Données mock & contenu initial](#17-données-mock--contenu-initial)
18. [Questions ouvertes restantes](#18-questions-ouvertes-restantes)

---

## 1. Vue d'ensemble du produit

### 1.1 Les quatre facettes de l'app

| Facette | Audience | Description |
|---------|----------|-------------|
| **Hub Équipes & Coureurs** | Tout le monde | Vitrine : profils des 4 équipes, fiches coureurs avec fun facts, identité visuelle parodique |
| **Classements & Résultats** | Tout le monde | Classements par étape (individuel + équipe), classement général, classements spéciaux |
| **Live Tracker** | Coureurs (émission) + Spectateurs (réception) | Carte temps réel, **écarts en temps entre coureurs**, trace GPX, profil d'élévation, checkpoints |
| **Fil d'actualité** | Tout le monde (lecture) + Admins (écriture) | Feed live pendant les étapes : texte + photos, moments forts, résultats intermédiaires |

### 1.2 Contexte d'utilisation

- **Avant le voyage** (dès maintenant → 19 juillet) : les spectateurs découvrent les équipes, les coureurs, les parcours. Crée l'engouement. Compteur J-X.
- **Pendant le voyage** (20-26 juillet) : suivi live des étapes, fil d'actualité, classements mis à jour en temps réel. Les coureurs ont l'app sur le guidon.
- **Après le voyage** : classements finaux consultables, mode replay pour revivre les étapes, archives. Alimente la rivalité pour 2027.

### 1.3 Contraintes clés

| Contrainte | Détail |
|-----------|--------|
| **Participation variable** | Les ~35 participants ne font pas tous les 6 étapes. Première partie de semaine (étapes 1-3 autour de Voiron) ≠ deuxième partie (étapes 4-6 autour de l'Alpe d'Huez/La Grave). Le modèle gère des inscriptions par étape. |
| **Offline obligatoire** | En montagne (étapes 4, 5, 6 — Croix de Fer, Alpe d'Huez, Lautaret/Sarennes), le réseau sera intermittent. L'app coureur buffer les positions GPS et synchronise au retour du réseau. |
| **Budget infra existant** | Railway (plan Hobby 5$/mois déjà payé) + Cloudflare R2 (déjà en place). Coût additionnel = uniquement la consommation des services supplémentaires sur Railway. |
| **PWA installable** | Manifest, service worker, icône. Installable sur l'écran d'accueil iOS et Android. |
| **Maintenable par Claude Code** | Zéro intervention manuelle complexe requise. ORM avec migrations intégrées, déploiement automatique. |
| **GPS toutes les 5 secondes** | Réduit le volume de données (~200k positions sur le voyage). |
| **Écart en temps = key feature** | Les coureurs veulent voir sur leur guidon l'écart en temps avec le leader et les coureurs adjacents. |

---

## 2. Utilisateurs & rôles

### 2.1 Matrice des rôles

| Rôle | Authentification | Droits |
|------|-----------------|--------|
| **Spectateur** | Aucune (accès public) | Consulter équipes, coureurs, classements, carte live, fil d'actualité, replay (lecture seule) |
| **Coureur** | Lien unique personnel | Émettre sa position GPS, voir sa fiche, voir les écarts en temps réel avec les autres coureurs |
| **Admin** (2-3 personnes) | Email + mot de passe (Auth.js) | Tout + gérer coureurs/équipes, inscrire les participants, saisir/corriger résultats, démarrer/arrêter étapes, uploader GPX, poster dans le fil d'actualité |

### 2.2 Authentification coureur — lien personnel

Chaque coureur reçoit un **lien unique** (ex: `app.tdf2026.fr/coureur/abc123`) envoyé par WhatsApp/SMS. Ce lien contient un token JWT signé qui identifie le coureur. Pas de création de compte, pas de mot de passe.

---

## 3. Fonctionnalités détaillées

### 3.1 Hub Équipes & Coureurs

#### Page d'accueil
- Hero avec identité visuelle TDF 2026
- Les 4 équipes en grille avec nom parodique, couleur, nombre de coureurs
- Lien vers l'étape en cours ou la prochaine
- Compteur J-X avant le départ / « Étape X en cours » pendant le voyage
- Chiffres clés : 380 km, 8 027m D+, 34 coureurs, 4 équipes

#### Page équipe
- Nom parodique, couleur, logo détourné
- Liste des coureurs avec photo et rôle humoristique
- Stats agrégées : classement actuel, temps cumulé
- Composition variable par étape

#### Fiche coureur
- Photo, prénom, surnom, équipe, couleur de l'équipe
- Nombre d'éditions (pictogramme)
- Étapes auxquelles il participe (✅ / ➖)
- Statistiques : classement individuel, meilleur résultat étape, temps cumulé
- **Fun facts** (11 questions) :

| Champ | Question |
|-------|---------|
| `coureur_tdf_2025` | Coureur du Tour 2025 préféré |
| `coureur_all_time` | Coureur all time préféré |
| `souvenir_tour` | Souvenir du Tour le plus marquant |
| `marque_velo_reve` | Marque de vélo de rêve |
| `col_prefere` | Col préféré déjà fait |
| `pire_souvenir_velo` | Pire souvenir à vélo |
| `meilleur_souvenir_velo` | Meilleur souvenir à vélo |
| `surnom_velo` | Surnom de ton vélo |
| `chanson_col` | Chanson dans un col de l'enfer |
| `boisson_apres_3000m` | Boisson après 3000m de D+ |
| `excuse_col` | Excuse quand cramé en col |

### 3.2 Classements & Résultats

#### Types d'étapes et calcul des temps

| Type d'étape | Étapes | Temps individuel | Temps équipe |
|-------------|--------|------------------|-------------|
| **Accidentée** | Étape 1 | Temps total (départ → arrivée) | Somme des N meilleurs |
| **CLM par équipe** | Étape 2 | Temps individuel = temps de l'équipe | Temps du N-ième coureur à la ligne (configurable, défaut N=3) |
| **CLM individuel** | Étape 3 | Temps total, pas de drafting | Somme des N meilleurs |
| **Montagne** | Étapes 4, 5, 6 | Temps d'ascension (pied → sommet) | Somme des N meilleurs |

#### Classement par étape
- Tableau : rang, nom, équipe (couleur), temps, écart au premier
- Filtrable par équipe
- Points intermédiaires affichés

#### Classement général individuel
- Temps cumulé de toutes les étapes participées
- Mode configurable par l'admin : A (complet uniquement), B (tous + indicateur X/6), C (catégories séparées)

#### Classement par équipe (LE PLUS IMPORTANT)
- Pour chaque étape : somme des N meilleurs temps individuels (N configurable)
- Classement cumulé sur toutes les étapes
- Affiché en premier partout

#### Classements spéciaux
- **Maillot jaune** : leader GC
- **Meilleur grimpeur** : meilleur temps cumulé aux checkpoints "col"
- **Lanterne rouge** : dernier du GC
- **Prix de la combativité** : attribué manuellement par les admins

### 3.3 Live Tracker

#### Vue spectateur (carte plein écran)
- Trace GPX du parcours + profil d'élévation en bandeau inférieur
- Marqueur coloré par équipe pour chaque coureur, mise à jour via SSE
- Clic sur un coureur → popup : nom, équipe, vitesse, écart en temps au leader
- Checkpoints marqués sur la carte et le profil
- Indicateur "LIVE" rouge clignotant

#### Vue coureur — Mode course (sur le guidon)
Design ultra-lisible sur un téléphone accroché au guidon :

```
┌─────────────────────────────┐
│  🟢 EN LIGNE    ⏱️ 1:42:30  │
│─────────────────────────────│
│      ↑ +0:45  Roro          │
│   ══════ MOI ══════         │
│      ↓ -1:12  Peltoche      │
│─────────────────────────────│
│  🏔️ Col Croix de Fer        │
│  dans 4.2 km · +380m D+    │
│─────────────────────────────│
│  📏 32.1 / 52 km            │
│  ⚡ 24.3 km/h   🔋 67%      │
│─────────────────────────────│
│  ÉCART AU LEADER : +2:34    │
│─────────────────────────────│
│      [ ⏹️ ARRÊTER ]          │
└─────────────────────────────┘
```

- Mode sombre, polices ≥ 36px, WakeLock actif
- Indicateur connexion : 🟢/🟡/🔴

#### Checkpoints & chronométrage automatique
- Geofences définies par admin sur le parcours GPX
- Rayon configurable (50m plaine, 100m montagne)
- Détection côté serveur (pas côté client)
- Admin peut corriger manuellement un temps

### 3.4 Fil d'actualité live

- Les admins postent des updates : texte + photos (moments forts, résultats intermédiaires)
- Feed chronologique inversé, posts épinglés en haut
- Mise à jour en temps réel via SSE
- Filtrable par étape
- Synchronisé avec le mode replay

### 3.5 Mode Replay

- Après une étape : rejouer en accéléré sur la carte (×5, ×10, ×20, ×50)
- Contrôles : play/pause, vitesse, barre de progression, scrub
- Le fil d'actualité défile en sync
- Passages de checkpoint marqués visuellement

### 3.6 Administration

- CRUD coureurs, équipes
- Upload GPX + config checkpoints (clic sur la carte)
- Matrice inscription coureurs × étapes
- Démarrer / arrêter une étape
- Config N pour CLM équipe et classement équipe
- Saisie/correction résultats
- Poster dans le fil d'actualité

---

## 4. Modèle de données

### 4.1 Schéma Prisma

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ── Enums ──────────────────────────────────────────

enum StageType {
  road
  team_tt
  individual_tt
  mountain
}

enum StageStatus {
  upcoming
  live
  paused
  finished
}

enum EntryStatus {
  registered
  started
  tracking
  finished
  dnf
  dns
}

enum CheckpointType {
  start
  col
  sprint
  finish
}

enum GCMode {
  all              // Tous classés, indicateur X/6 étapes
  complete_only    // Seuls les coureurs avec toutes les étapes
  categories       // Catégories séparées
}

enum PostType {
  text
  photo
  result
  highlight
}

// ── Models ─────────────────────────────────────────

model Team {
  id          String   @id @default(cuid())
  name        String
  slug        String   @unique
  color       String   // Hex color
  logoUrl     String?  @map("logo_url")
  description String?
  riders      Rider[]
  createdAt   DateTime @default(now()) @map("created_at")

  @@map("teams")
}

model Rider {
  id            String       @id @default(cuid())
  firstName     String       @map("first_name")
  nickname      String?
  slug          String       @unique
  photoUrl      String?      @map("photo_url")
  teamId        String       @map("team_id")
  team          Team         @relation(fields: [teamId], references: [id])
  token         String       @unique @default(cuid())
  editionCount  Int          @default(1) @map("edition_count")
  funFacts      Json?        @map("fun_facts") // JSONB with 11 fields
  entries       StageEntry[]
  createdAt     DateTime     @default(now()) @map("created_at")

  @@map("riders")
}

model Stage {
  id           String      @id @default(cuid())
  number       Int         @unique // 1-6
  name         String
  type         StageType
  date         DateTime
  distanceKm   Float       @map("distance_km")
  elevationM   Int         @map("elevation_m")
  gpxUrl       String?     @map("gpx_url")
  status       StageStatus @default(upcoming)
  startTime    DateTime?   @map("start_time")
  endTime      DateTime?   @map("end_time")
  ttNthRider   Int         @default(3) @map("tt_nth_rider")
  teamTopN     Int         @default(3) @map("team_top_n")
  gcMode       GCMode      @default(all) @map("gc_mode")
  entries      StageEntry[]
  checkpoints  Checkpoint[]
  posts        LivePost[]
  createdAt    DateTime    @default(now()) @map("created_at")

  @@map("stages")
}

model StageEntry {
  id          String      @id @default(cuid())
  riderId     String      @map("rider_id")
  rider       Rider       @relation(fields: [riderId], references: [id])
  stageId     String      @map("stage_id")
  stage       Stage       @relation(fields: [stageId], references: [id])
  status      EntryStatus @default(registered)
  timeRecords TimeRecord[]
  gpsPositions GpsPosition[]
  createdAt   DateTime    @default(now()) @map("created_at")

  @@unique([riderId, stageId])
  @@map("stage_entries")
}

model Checkpoint {
  id           String         @id @default(cuid())
  stageId      String         @map("stage_id")
  stage        Stage          @relation(fields: [stageId], references: [id])
  name         String
  type         CheckpointType
  latitude     Float
  longitude    Float
  radiusM      Int            @default(50) @map("radius_m")
  order        Int            // Ordre sur le parcours
  kmFromStart  Float          @map("km_from_start")
  elevation    Int?
  timeRecords  TimeRecord[]
  createdAt    DateTime       @default(now()) @map("created_at")

  @@map("checkpoints")
}

model TimeRecord {
  id           String     @id @default(cuid())
  entryId      String     @map("entry_id")
  entry        StageEntry @relation(fields: [entryId], references: [id])
  checkpointId String     @map("checkpoint_id")
  checkpoint   Checkpoint @relation(fields: [checkpointId], references: [id])
  timestamp    DateTime   // Heure de passage
  isManual     Boolean    @default(false) @map("is_manual")
  correctedBy  String?    @map("corrected_by")
  createdAt    DateTime   @default(now()) @map("created_at")

  @@unique([entryId, checkpointId])
  @@map("time_records")
}

model GpsPosition {
  id        BigInt     @id @default(autoincrement())
  entryId   String     @map("entry_id")
  entry     StageEntry @relation(fields: [entryId], references: [id])
  latitude  Float
  longitude Float
  altitude  Float?
  speed     Float?
  accuracy  Float?
  timestamp DateTime   // Timestamp du téléphone
  createdAt DateTime   @default(now()) @map("created_at")

  @@index([entryId, timestamp])
  @@index([createdAt]) // Pour le replay par ordre chronologique
  @@map("gps_positions")
}

model LivePost {
  id        String   @id @default(cuid())
  stageId   String   @map("stage_id")
  stage     Stage    @relation(fields: [stageId], references: [id])
  authorId  String   @map("author_id")
  type      PostType @default(text)
  content   String
  photoUrl  String?  @map("photo_url")
  pinned    Boolean  @default(false)
  createdAt DateTime @default(now()) @map("created_at")

  @@index([stageId, createdAt(sort: Desc)])
  @@map("live_posts")
}

model AdminUser {
  id          String   @id @default(cuid())
  email       String   @unique
  password    String   // Hashed via bcrypt
  displayName String   @map("display_name")
  createdAt   DateTime @default(now()) @map("created_at")

  @@map("admin_users")
}
```

### 4.2 Calcul des classements

Les classements sont calculés par des requêtes Prisma (pas de vues SQL) dans `src/lib/standings/calculator.ts`. Cette logique côté application (pas côté DB) est plus facile à débugger et maintenir via Claude Code.

### 4.3 Volumétrie

| Table | Volume | Fréquence d'écriture |
|-------|--------|---------------------|
| Team | 4 | Fixe |
| Rider | ~35 | Fixe |
| Stage | 6 | Fixe |
| StageEntry | ~120-150 | Avant le voyage |
| Checkpoint | ~30-40 | Avant le voyage |
| TimeRecord | ~600-800 | Pendant les étapes |
| **GpsPosition** | **~150 000 — 250 000** | **1/5sec/coureur** |
| LivePost | ~50-100 | Pendant les étapes |

Volume GPS très gérable pour PostgreSQL avec les index ci-dessus.

---

## 5. Architecture technique

### 5.1 Vue d'ensemble

```
┌───────────────────────────────────────────────────────────────┐
│                        CLIENTS                                 │
│                                                                │
│  ┌──────────────┐  ┌───────────────┐  ┌───────────────────┐   │
│  │  Spectateur   │  │   Coureur     │  │      Admin        │   │
│  │  (PWA)        │  │   (PWA)       │  │      (PWA)        │   │
│  │               │  │               │  │                   │   │
│  │ • Carte live  │  │ • GPS emit    │  │ • CRUD données    │   │
│  │ • Classements │  │ • Mode course │  │ • Résultats       │   │
│  │ • Profils     │  │ • Écarts temps│  │ • Fil actu        │   │
│  │ • Fil actu    │  │ • Buffer      │  │ • Config étapes   │   │
│  │ • Replay      │  │   offline     │  │                   │   │
│  └───────┬───────┘  └───────┬───────┘  └────────┬──────────┘   │
└──────────┼──────────────────┼───────────────────┼──────────────┘
           │                  │                   │
           │ SSE (GET)        │ HTTPS POST        │ HTTPS
           │                  │                   │
┌──────────┼──────────────────┼───────────────────┼──────────────┐
│          ▼                  ▼                   ▼              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Next.js (App Router) — Railway              │   │
│  │                                                          │   │
│  │  ┌──────────┐  ┌───────────┐  ┌────────────────────┐    │   │
│  │  │ Pages    │  │ API Routes│  │ SSE Endpoint       │    │   │
│  │  │ SSR      │  │           │  │                    │    │   │
│  │  │          │  │ /api/gps/ │  │ /api/live/stream   │    │   │
│  │  │ Accueil  │  │ /api/admin│  │                    │    │   │
│  │  │ Équipes  │  │ /api/auth │  │ Broadcast positions│    │   │
│  │  │ Étapes   │  │           │  │ + feed + classmnts │    │   │
│  │  │ etc.     │  │           │  │                    │    │   │
│  │  └──────────┘  └───────────┘  └────────────────────┘    │   │
│  └──────────────────────┬──────────────────────────────────┘   │
│                         │                                      │
│            ┌────────────┼────────────┐                         │
│            ▼            ▼            ▼                          │
│  ┌──────────────┐ ┌──────────┐ ┌──────────────┐               │
│  │ PostgreSQL   │ │  In-mem  │ │ Cloudflare   │               │
│  │ (Railway)    │ │  state   │ │ R2           │               │
│  │              │ │          │ │              │               │
│  │ Via Prisma   │ │ Positions│ │ • Photos     │               │
│  │ ORM         │ │ courantes│ │ • Logos      │               │
│  │              │ │ + histo  │ │ • GPX files  │               │
│  │              │ │ leader   │ │ • Feed photos│               │
│  └──────────────┘ └──────────┘ └──────────────┘               │
│                                                                │
│                    RAILWAY + CLOUDFLARE                         │
└────────────────────────────────────────────────────────────────┘
```

### 5.2 Flux de données GPS

```
Téléphone coureur               Serveur (Next.js sur Railway)       Spectateurs / Coureurs
      │                                │                                    │
      │  1. watchPosition()            │                                    │
      │     (1 point / 5 sec)          │                                    │
      │          │                     │                                    │
      │  2. Buffer IndexedDB           │                                    │
      │          │                     │                                    │
      │  3. Toutes les 15 sec :        │                                    │
      │     POST /api/gps/batch        │                                    │
      │  ──────────────────────►       │                                    │
      │                                │  4. Valider JWT + étape            │
      │                                │  5. INSERT batch via Prisma        │
      │                                │  6. Check geofence checkpoints     │
      │                                │  7. Si checkpoint → TimeRecord     │
      │                                │  8. Calculer écarts en temps       │
      │                                │  9. Push via SSE ──────────────►   │
      │                                │     à tous les clients             │
      │                                │     connectés sur                  │
      │                                │     /api/live/stream?stage=X       │
```

**Pourquoi SSE plutôt que WebSocket ?**
- Les spectateurs ne font que recevoir → SSE (unidirectionnel serveur → client) suffit
- SSE fonctionne nativement avec les API Routes Next.js (pas de serveur séparé)
- SSE se reconnecte automatiquement si la connexion est coupée
- Pas de lib externe à installer
- Compatible avec tous les navigateurs modernes

---

## 6. Stack technologique

### 6.1 Choix définitifs

| Couche | Technologie | Justification |
|--------|-------------|---------------|
| **Frontend** | **Next.js 14+ (App Router)** | SSR, React, PWA avec `next-pwa`, TypeScript |
| **Carte** | **MapLibre GL JS** + **MapTiler** (free tier) | Open source, performant, 100k req/mois gratuit |
| **Profil d'élévation** | **Recharts** | Graphique simple synchro avec la carte |
| **UI** | **Tailwind CSS** + **shadcn/ui** | Rapide, composants accessibles, look custom |
| **ORM** | **Prisma** | Types auto-générés, migrations intégrées, DX excellent |
| **Base de données** | **PostgreSQL** (Railway) | Managé, déjà en place |
| **Temps réel** | **Server-Sent Events (SSE)** | Natif, pas de lib, unidirectionnel, auto-reconnexion |
| **Auth admins** | **Auth.js (NextAuth) v5** | Credentials provider (email + password), session JWT |
| **Auth coureurs** | **JWT custom** | Token signé dans l'URL, pas de compte à créer |
| **Storage fichiers** | **Cloudflare R2** via **S3 SDK** | Déjà en place, compatible S3, gratuit jusqu'à 10 Go |
| **Hosting** | **Railway** | Déjà utilisé, deploy depuis GitHub, PostgreSQL intégré |
| **Monitoring** | **Sentry** (free tier) | Erreurs frontend + backend |
| **GPX parsing** | **gpxparser** (npm) | Parse GPX → coordonnées + élévation |

### 6.2 Pourquoi ce stack est le bon ici

- **Railway** : tu le connais déjà, tu paies déjà l'abonnement, un projet de plus ne coûte quasi rien
- **Prisma** : quand Claude Code modifie le schéma, il modifie un fichier `.prisma` lisible et lance `npx prisma migrate dev`. Pas de SQL brut à écrire manuellement
- **Auth.js** : ~50 lignes de config pour l'auth admin. Bien documenté, Claude Code connaît parfaitement
- **SSE** : ~30 lignes de code pour le endpoint, natif dans Next.js. Pas de service tiers à configurer
- **Cloudflare R2** : tu l'as déjà, compatible avec le SDK AWS S3, zéro config supplémentaire

### 6.3 Structure du repo

```
tdf2026-live/
├── prisma/
│   ├── schema.prisma              # Schéma de données (source de vérité)
│   ├── migrations/                # Migrations auto-générées par Prisma
│   └── seed.ts                    # Données mock
├── src/
│   ├── app/
│   │   ├── page.tsx               # Accueil
│   │   ├── equipes/
│   │   │   ├── page.tsx
│   │   │   └── [slug]/page.tsx
│   │   ├── coureurs/
│   │   │   └── [slug]/page.tsx
│   │   ├── etapes/
│   │   │   ├── page.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx
│   │   │       ├── live/page.tsx
│   │   │       └── replay/page.tsx
│   │   ├── classements/page.tsx
│   │   ├── actu/page.tsx
│   │   ├── coureur/               # Auth par token
│   │   │   └── [token]/
│   │   │       ├── page.tsx
│   │   │       └── live/page.tsx  # Mode course
│   │   ├── admin/                 # Auth Auth.js
│   │   │   ├── login/page.tsx
│   │   │   ├── page.tsx
│   │   │   ├── coureurs/page.tsx
│   │   │   ├── equipes/page.tsx
│   │   │   ├── etapes/[id]/page.tsx
│   │   │   ├── inscriptions/page.tsx
│   │   │   ├── resultats/page.tsx
│   │   │   └── actu/page.tsx
│   │   └── api/
│   │       ├── gps/batch/route.ts       # Ingestion GPS
│   │       ├── live/stream/route.ts     # SSE endpoint
│   │       ├── auth/[...nextauth]/route.ts  # Auth.js
│   │       ├── upload/route.ts          # Upload fichiers → R2
│   │       └── admin/                   # Routes admin protégées
│   ├── components/
│   │   ├── ui/                    # shadcn/ui
│   │   ├── map/                   # MapLibre
│   │   ├── elevation/             # Profil d'élévation
│   │   ├── standings/             # Tableaux classements
│   │   ├── riders/                # Cards, fiches
│   │   ├── stages/                # Info étape, checkpoints
│   │   ├── live/                  # Mode course, indicateurs
│   │   ├── feed/                  # Fil d'actualité
│   │   ├── replay/                # Contrôles replay
│   │   ├── admin/                 # Composants admin
│   │   └── layout/                # Header, nav, footer
│   ├── lib/
│   │   ├── db.ts                  # Prisma client singleton
│   │   ├── auth/
│   │   │   ├── config.ts          # Config Auth.js
│   │   │   └── jwt.ts             # JWT custom pour coureurs
│   │   ├── gps/
│   │   │   ├── tracker.ts         # Acquisition GPS client
│   │   │   ├── buffer.ts          # Buffer IndexedDB
│   │   │   ├── sync.ts            # Sync client → serveur
│   │   │   └── geofence.ts        # Détection checkpoint (serveur)
│   │   ├── gpx/
│   │   │   ├── parser.ts          # Parse GPX
│   │   │   └── projection.ts      # Projection sur polyline
│   │   ├── time-gap/
│   │   │   ├── calculator.ts      # ⭐ Calcul écarts en temps
│   │   │   ├── progression-history.ts
│   │   │   └── types.ts
│   │   ├── sse/
│   │   │   ├── manager.ts         # Gestion des connexions SSE
│   │   │   └── events.ts          # Types d'événements
│   │   ├── storage/
│   │   │   └── r2.ts              # Client Cloudflare R2 (S3 SDK)
│   │   ├── standings/
│   │   │   └── calculator.ts      # Logique classements
│   │   └── utils/
│   │       ├── haversine.ts
│   │       ├── formatters.ts
│   │       └── constants.ts
│   ├── hooks/
│   │   ├── useGPSTracker.ts
│   │   ├── useSSE.ts              # Hook SSE générique
│   │   ├── useLivePositions.ts    # Positions via SSE
│   │   ├── useTimeGaps.ts
│   │   ├── useStandings.ts
│   │   └── useLiveFeed.ts
│   ├── types/
│   │   └── index.ts
│   └── __tests__/
│       ├── unit/
│       └── integration/
├── scripts/
│   ├── simulate-rider.ts
│   ├── simulate-race.ts
│   └── seed-results.ts
├── public/
│   ├── manifest.json
│   └── icons/
├── docs/                          # Spec, annexes, backlog
├── CLAUDE.md
├── TESTING.md
└── e2e/                           # Tests Playwright
```

---

## 7. Tracking GPS — Spécification détaillée

*(Identique à la v2 — pas de changement, la logique GPS côté client ne dépend pas de l'infra)*

### 7.1 Côté client

- `watchPosition()` avec haute précision, throttle à 1 point / 5 secondes
- Filtres : accuracy > 50m rejeté, vitesse > 80 km/h rejeté, distance < 2m rejeté
- Buffer IndexedDB (lib `idb`) avec flag `synced`
- Envoi batch POST toutes les 15 sec (~3 points)
- Offline : accumulation IndexedDB, sync par paquets de 50 au retour réseau
- WakeLock actif, app au premier plan obligatoire

### 7.2 Côté serveur

```
POST /api/gps/batch
Authorization: Bearer <rider_jwt_token>

{ "stageId": "...", "positions": [{ lat, lng, alt, speed, acc, ts }, ...] }
```

Pipeline :
1. Vérifier JWT → riderId
2. Vérifier étape live + coureur inscrit
3. `prisma.gpsPosition.createMany({ data: [...] })`
4. Check geofence sur prochain checkpoint
5. Si match → `prisma.timeRecord.create()`
6. Calculer écarts en temps
7. Push snapshot via SSE manager

---

## 8. Calcul des écarts en temps — Key Feature

*(Identique à la v2 — pas de changement, l'algorithme est indépendant de l'infra)*

1. Projeter chaque coureur sur la polyline GPX → `distanceFromStart`
2. Historique de progression par coureur : `[{ distance, timestamp }]` en mémoire
3. Écart = `monTimestamp - timestampDuLeaderÀCetteDistance` (interpolation linéaire)
4. Pour les adjacents : même logique avec le coureur devant/derrière

Cache en mémoire du processus Node.js (pas en DB). Rechargé depuis la DB au redémarrage.

---

## 9. Temps réel — Server-Sent Events (SSE)

### 9.1 Architecture SSE

```
┌──────────────────────────────────────────────────┐
│                 Serveur Next.js                    │
│                                                    │
│  ┌──────────────────────────────────────────────┐  │
│  │          SSE Connection Manager               │  │
│  │                                                │  │
│  │  Map<stageId, Set<WritableStream>>            │  │
│  │                                                │  │
│  │  Quand un spectateur se connecte :            │  │
│  │    GET /api/live/stream?stageId=xxx           │  │
│  │    → Ajouter son stream au Set                │  │
│  │                                                │  │
│  │  Quand un batch GPS arrive :                  │  │
│  │    → Calculer snapshot (positions + écarts)   │  │
│  │    → Itérer sur le Set                        │  │
│  │    → Écrire dans chaque stream                │  │
│  │                                                │  │
│  │  Quand un spectateur se déconnecte :          │  │
│  │    → Retirer son stream du Set                │  │
│  └──────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────┘
```

### 9.2 Endpoint SSE

```typescript
// src/app/api/live/stream/route.ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const stageId = searchParams.get('stageId');

  const stream = new ReadableStream({
    start(controller) {
      // Enregistrer ce client
      sseManager.addClient(stageId, controller);

      // Envoyer le snapshot initial
      const snapshot = sseManager.getLatestSnapshot(stageId);
      if (snapshot) {
        controller.enqueue(`data: ${JSON.stringify(snapshot)}\n\n`);
      }
    },
    cancel() {
      sseManager.removeClient(stageId, controller);
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  });
}
```

### 9.3 Types d'événements SSE

| Événement | Contenu | Fréquence |
|-----------|---------|-----------|
| `positions` | Snapshot de tous les coureurs (lat, lng, speed, distFromStart, timeGap, riderAhead, riderBehind) | Toutes les 5-15 sec |
| `checkpoint` | Un coureur a passé un checkpoint (riderId, checkpointName, time) | À chaque passage |
| `feed` | Nouveau post dans le fil d'actualité | À chaque publication |
| `stage_status` | Changement de statut d'étape (live, paused, finished) | Rare |

### 9.4 Côté client — Hook SSE

```typescript
// src/hooks/useSSE.ts
function useSSE<T>(url: string): { data: T | null, connected: boolean } {
  // Utilise EventSource (natif navigateur)
  // Auto-reconnexion intégrée par le navigateur
  // Pas de lib externe
}
```

### 9.5 Limites et mitigation

- **Railway Hobby** : pas de limite explicite de connexions SSE, mais le serveur Node.js a une mémoire limitée (8 Go max). Chaque connexion SSE consomme ~1-2 Ko → 200 connexions = ~400 Ko → négligeable
- **Timeout** : Railway peut couper les connexions inactives après 5 min. Mitigation : envoyer un heartbeat (`event: ping\ndata: {}\n\n`) toutes les 30 secondes
- **Pas de scaling horizontal** : avec un seul process Node.js, tous les clients sont connectés au même serveur → OK pour 200 connexions. Si on devait scaler, il faudrait un Redis pub/sub entre les instances, mais c'est overkill ici.

---

## 10. Gestion offline & sync

*(Identique à la v2)*

- Service Worker : precache shell, cache-first pour assets, network-first pour API
- iOS : app au premier plan obligatoire, pas de Background Sync
- Stratégie de cache par type de ressource (tuiles permanentes, classements network-first, etc.)

---

## 11. Mode Replay

*(Identique à la v2)*

- Chargement des GpsPosition, TimeRecord, LivePost via API classiques (pas SSE)
- Animation côté client avec requestAnimationFrame
- Contrôles : play/pause, ×5/×10/×20/×50, scrub

---

## 12. Fil d'actualité live

*(Identique à la v2, sauf que le broadcast se fait via SSE au lieu de Supabase Realtime)*

- Admin poste → INSERT via Prisma → push événement `feed` via SSE manager
- Upload photo → Cloudflare R2 via l'API route `/api/upload`

---

## 13. Sécurité & authentification

### 13.1 Spectateurs → Aucune auth, tout public en lecture

### 13.2 Coureurs → JWT custom dans l'URL

- Token signé HS256 avec `JWT_SECRET`
- Payload : `{ riderId, exp }`
- Expiration : 1 mois
- Autorise uniquement POST /api/gps/batch pour ce riderId
- Révocable par l'admin (flag en DB)

### 13.3 Admins → Auth.js (NextAuth) v5

```typescript
// Config Auth.js avec Credentials provider
// Les comptes admin sont créés en seed (pas de signup public)
// Password hashé avec bcrypt
// Session stockée en JWT (pas de session DB)
// Middleware Next.js protège toutes les routes /admin/*
```

### 13.4 Protection des API Routes

| Route | Protection |
|-------|-----------|
| `GET /api/live/stream` | Aucune (public) |
| `POST /api/gps/batch` | JWT coureur |
| `GET /api/replay/*` | Aucune (public) |
| `POST /api/admin/*` | Session Auth.js (admin) |
| `POST /api/upload` | Session Auth.js (admin) |

---

## 14. Infrastructure & déploiement

### 14.1 Coûts

| Service | Plan | Coût additionnel | Notes |
|---------|------|-----------------|-------|
| **Railway** | Hobby (déjà payé) | **~3-8$/mois d'usage** | PostgreSQL + Next.js server. Le 5$ d'abonnement est déjà couvert. L'usage additionnel dépend de la consommation. |
| **Cloudflare R2** | Free tier (déjà en place) | **0€** | 10 Go stockage, 10M requêtes/mois |
| **MapTiler** | Free | **0€** | 100k tuiles/mois |
| **Sentry** | Free | **0€** | 5k events/mois |
| **Domaine** | .fr | **~8€/an** | À choisir |
| **Total additionnel** | | **~3-8€/mois** | ✅ Quasi gratuit vu l'abonnement Railway existant |

### 14.2 Services Railway pour ce projet

Un projet Railway "tdf2026-live" avec 2 services :

| Service | Type | Description |
|---------|------|-------------|
| **tdf2026-web** | Web Service (depuis GitHub) | Next.js app (pages SSR + API routes + SSE) |
| **tdf2026-db** | PostgreSQL | Base de données |

### 14.3 Déploiement

```
GitHub repo (main)
    │
    └──► Railway : auto-deploy sur push
          ├── Build Next.js
          ├── Run prisma migrate deploy
          └── Start server
```

Railway détecte automatiquement Next.js et configure le build. Les migrations Prisma sont exécutées au démarrage via un script dans `package.json`.

### 14.4 Variables d'environnement (Railway dashboard)

```env
DATABASE_URL=postgresql://...          # Auto-généré par Railway
JWT_SECRET=...                         # Généré par Claude Code
NEXTAUTH_SECRET=...                    # Généré par Claude Code
NEXTAUTH_URL=https://tdf2026.up.railway.app  # URL Railway (ou domaine custom)

# Cloudflare R2
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=tdf2026
R2_PUBLIC_URL=https://...              # URL publique du bucket

# MapTiler
NEXT_PUBLIC_MAPTILER_KEY=...

# App
NEXT_PUBLIC_APP_URL=https://tdf2026.up.railway.app
```

---

## 15. Performance & limites

### 15.1 SSE — Pas de point de tension

- Un process Node.js gère facilement 200+ connexions SSE simultanées
- Chaque connexion = ~1-2 Ko de mémoire
- Heartbeat toutes les 30 sec pour éviter les timeouts Railway
- Pas de limite de connexions sur Railway Hobby (limité par la RAM, 8 Go max → des milliers de connexions possibles)

### 15.2 PostgreSQL — Confortable

- ~250k lignes de GPS positions → une table bien indexée, requêtes < 50ms
- Prisma query engine optimise les requêtes batch
- Le replay charge ~30k positions → paginé en 3-4 requêtes

### 15.3 Calcul d'écarts — En mémoire

- La polyline GPX et les historiques de progression vivent en mémoire Node.js
- Pas de requête DB pour le calcul d'écarts → latence < 10ms
- Si le serveur redémarre (deploy, crash) → les historiques sont reconstruits depuis la DB au premier batch GPS reçu

---

## 16. Phases de développement

### Phase 1 — Setup & Fondations (semaine 1)
- Setup Next.js + Tailwind + shadcn/ui + TypeScript
- Prisma schema + migrations + seed données mock
- Auth.js pour les admins
- JWT custom pour les coureurs
- Client Cloudflare R2
- PWA (manifest, service worker, icônes)

### Phase 2 — Vitrine publique (semaine 2-3)
- Layout, navigation, pages publiques
- Carte MapLibre + profil d'élévation
- Parser GPX
- Responsive mobile-first

### Phase 3 — Admin (semaine 3-4)
- Dashboard, CRUD équipes/coureurs, gestion étapes/checkpoints
- Matrice inscriptions, contrôle d'étape
- Upload fichiers vers R2

### Phase 4 — Live Tracker & Écarts (semaine 4-6)
- Tracking GPS client (hook, buffer, sync)
- Endpoint ingestion GPS + geofence
- Calcul écarts en temps
- SSE manager + endpoint stream
- Carte live spectateur + mode course

### Phase 5 — Classements & Résultats (semaine 6-7)
- Logique de calcul des classements (Prisma queries)
- Interface admin résultats
- Pages publiques classements

### Phase 6 — Fil d'actualité & Replay (semaine 7-8)
- CRUD feed admin + upload photos R2
- Feed public via SSE
- Mode replay (chargement, player, animation)

### Phase 7 — Polish & Tests terrain (semaine 8-10)
- Test GPS réel en vélo
- Optimisation performances
- Identité visuelle finale
- Déploiement prod sur Railway

---

## 17. Données mock & contenu initial

*(Identique à la v2)*

### 4 équipes
| Nom | Parodie de | Couleur | Statut |
|-----|-----------|---------|--------|
| Visma Lease a Ricard | Visma-Lease a Bike | `#FFD700` | ✅ Confirmé |
| EAU Team Pastis | UAE Team Emirates | `#E8E0D0` | ✅ Confirmé |
| Groupama Fédération du Jaune | Groupama-FDJ | `#0055A4` | ⚠️ Proposition |
| INEOS Anisés | INEOS Grenadiers | `#E03C31` | ⚠️ Proposition |

### 6 étapes
| # | Date | Nom | Type | Km | D+ |
|---|------|-----|------|-----|-----|
| 1 | 20/07 | Sortie accidentée | road | 75.5 | 969 |
| 2 | 21/07 | CLM par équipe | team_tt | 34.6 | 219 |
| 3 | 22/07 | CLM individuel | individual_tt | 32.5 | 174 |
| 4 | 23/07 | Col de la Croix de Fer | mountain | 100.8 | 2291 |
| 5 | 24/07 | Alpe d'Huez | mountain | 68.5 | 2171 |
| 6 | 25/07 | Lautaret + Sarennes | mountain | 68.3 | 2203 |

### 34 participants
Florian, Paul, Anat', Roro, KT, Maxou, Valou, Nico, Selim, Jules, Valou (2), Inès, Coco, Caro, Lucie, Dani, Anselme, Romain, Popo, Gab, Peltoche, Sury, Stanoche, Eve, Ambre, Gaelle, Antonin, Maxence, Benjamin, Loulou, Louison, Antoine, Luc, Robin

---

## 18. Questions ouvertes restantes

*(Identique à la v2)*

| # | Question | Quand décider |
|---|----------|---------------|
| Q1 | Mode classement général (A/B/C) | Pendant le voyage |
| Q2 | N pour classement équipe | Début juillet |
| Q3 | N pour CLM équipe | Début juillet |
| Q4 | Noms équipes 3 et 4 | Avant le 15 mai |
| Q5 | Domaine web | Pas bloquant |
| Q6 | Répartition coureurs/équipes | 13-14 juin |
| Q7 | Photos coureurs | À collecter |

Toutes non-bloquantes pour le développement.

---

*Spec v3.0 — Stack Railway + PostgreSQL + Prisma + Auth.js + SSE + Cloudflare R2*
*Dernière mise à jour : 31 mars 2026*
