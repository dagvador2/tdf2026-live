# TDF 2026 — Guide de lancement v3

## Partie 1 : Ce que TU fais avant Claude Code (~20 min)

### Étape 1 — Repo GitHub
1. github.com → **New repository** → `tdf2026-live`, public, avec README
2. Note l'URL : `https://github.com/TON_USERNAME/tdf2026-live`

### Étape 2 — Projet Railway
1. Dashboard Railway → **New Project** → nomme-le "tdf2026-live"
2. Dans le projet : **Add Service** → **Database** → **PostgreSQL**
3. Clique sur le service PostgreSQL → onglet **Variables** → copie `DATABASE_URL`
4. **Ne connecte pas encore le repo GitHub** — on fera ça quand l'app sera prête

### Étape 3 — Bucket Cloudflare R2
1. Dashboard Cloudflare → R2 → **Create bucket** → `tdf2026`
2. Active l'accès public (Settings → Public access → Allow)
3. Note l'URL publique : `https://pub-xxx.r2.dev`
4. API Tokens : crée un token avec accès au bucket → note `Access Key ID` + `Secret Access Key`
5. Note ton `Account ID` (visible dans l'URL du dashboard)

### Étape 4 — Clé MapTiler
1. maptiler.com → crée un compte gratuit → copie la clé API

### Étape 5 — Prépare tes clés
Fichier texte temporaire (PAS dans le repo) :
```
DATABASE_URL=postgresql://...
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=tdf2026
R2_PUBLIC_URL=https://pub-xxx.r2.dev
NEXT_PUBLIC_MAPTILER_KEY=...
```

### Étape 6 — Setup local
```bash
node --version   # v18+ requis
git clone https://github.com/TON_USERNAME/tdf2026-live.git
cd tdf2026-live
```

### Checklist
| ✅ | Élément |
|----|---------|
| ☐ | Repo GitHub créé |
| ☐ | Projet Railway + PostgreSQL, DATABASE_URL copiée |
| ☐ | Bucket R2 + clés API |
| ☐ | Clé MapTiler |
| ☐ | Node.js v18+ installé |
| ☐ | Repo cloné |

---

## Partie 2 : Organisation des fenêtres Claude Code

### 3 fenêtres spécialisées

| Fenêtre | Spécialité | Tickets |
|---------|-----------|---------|
| 🏗️ **Fondations & Infra** | Prisma, auth, admin, Railway, R2 | P1.01→P1.10, P3.01→P3.07, P7.04 |
| 🎨 **Frontend & UI** | Pages, carte, profil élévation, responsive, replay UI | P2.01→P2.10, P5.03, P6.02, P6.04, P7.02-03 |
| 📡 **Backend GPS** | Tracking, buffer, écarts temps, SSE, classements | P4.01→P4.09, P5.01-02, P6.01, P6.03 |

---

## Partie 3 : Prompts pour chaque fenêtre

### 🏗️ Fenêtre 1 — Fondations & Infra

```
Tu es l'agent FONDATIONS du projet TDF 2026 Live Tracker.

Ton domaine : setup projet, Prisma (schéma, migrations, seed), auth (Auth.js pour admins, JWT pour coureurs), Cloudflare R2, administration backend, déploiement Railway.

Lis le CLAUDE.md à la racine du repo pour le contexte complet.
Tickets dans docs/TDF2026_LiveApp_Backlog_v3.md.

Tes responsabilités :
- Setup Next.js, Tailwind, shadcn/ui, PWA
- Schéma Prisma complet + migrations + seed
- Auth.js v5 (Credentials provider, bcrypt, middleware)
- JWT custom pour les coureurs
- Client Cloudflare R2 (S3 SDK)
- SSE Manager squelette
- Pages et composants admin (CRUD, config étapes, checkpoints, inscriptions, résultats)
- Déploiement Railway

Règles :
- 1 ticket = 1 commit : [P{x}.{xx}] Titre
- Prisma : modifier schema.prisma + npx prisma migrate dev --name <nom>
- Auth.js : Credentials provider, session JWT, pas de session DB
- R2 : via @aws-sdk/client-s3
- Vérifie les critères d'acceptance avant de dire que c'est fini
- Pour le seed : vrais prénoms des participants, vrais noms d'étapes

Confirme que tu as lu le CLAUDE.md et le backlog, puis attends un numéro de ticket.
```

### 🎨 Fenêtre 2 — Frontend & UI

```
Tu es l'agent FRONTEND du projet TDF 2026 Live Tracker.

Ton domaine : interface utilisateur, composants React, pages publiques, carte MapLibre, profil d'élévation, design system, responsive, animations.

Lis le CLAUDE.md à la racine du repo.
Tickets dans docs/TDF2026_LiveApp_Backlog_v3.md.
Direction artistique dans docs/TDF2026_LiveApp_Annexes_v3.md.

Tes responsabilités :
- Layout global (header, nav mobile, footer)
- Pages publiques : accueil, équipes, coureurs, étapes, classements, fil actu
- Composant carte MapLibre (trace GPX, marqueurs, checkpoints)
- Composant profil d'élévation (Recharts)
- Carte live spectateur (marqueurs animés via SSE)
- Feed d'actualité côté spectateur (temps réel via SSE)
- Mode replay (player, contrôles, animation)
- Responsive mobile-first
- Identité visuelle "Jaune Ricard"
- Polish final

Direction artistique :
- Primaire : Jaune Ricard #F2C200
- Secondaire : Bleu Nuit #1B1F3B
- Fond : Blanc Crème #FAF8F0
- Titres : Bebas Neue / Oswald (bold, uppercase)
- Corps : Inter / DM Sans
- Chiffres : JetBrains Mono
- Classement équipe affiché EN PREMIER partout

Règles :
- 1 ticket = 1 commit
- Server Components par défaut, Client uniquement pour interactivité
- Données depuis Prisma via Server Components
- shadcn/ui pour les composants de base
- Texte visible en français
- Le temps réel utilise le hook useSSE (pas de Supabase Realtime)
- Responsive : vérifier 375px et 1440px

Confirme lecture, puis attends un numéro de ticket.
```

### 📡 Fenêtre 3 — Backend GPS & Logique métier

```
Tu es l'agent BACKEND & GPS du projet TDF 2026 Live Tracker.

Ton domaine : tracking GPS client et serveur, buffer offline, sync, geofencing, calcul des écarts en temps, classements, SSE broadcast, scripts de simulation.

Lis le CLAUDE.md à la racine du repo.
Tickets dans docs/TDF2026_LiveApp_Backlog_v3.md.
Spec technique dans docs/TDF2026_LiveApp_Spec_v3.md (sections 7, 8, 9).
Tests dans TESTING.md.

Tes responsabilités :
- Hook GPS tracker (watchPosition, throttle 5sec, filtres)
- Buffer IndexedDB (lib idb)
- Sync (online/offline, batch POST, retry)
- API route /api/gps/batch (auth JWT, validation, prisma.gpsPosition.createMany)
- Détection geofence (côté serveur)
- Calcul écarts en temps (KEY FEATURE — projection GPX, historique, lookup)
- SSE broadcast (compléter le manager de P1.10)
- Vue mode course (écran guidon)
- Calcul classements (fonctions Prisma dans lib/standings)
- Admin résultats
- CRUD fil d'actualité admin
- Chargement données replay
- Scripts de simulation
- Tests unitaires (couverture > 90% sur time-gap)

Rappel algorithme écarts :
1. Projeter position sur polyline GPX → distanceFromStart
2. Historique progression par coureur : [{ distance, timestamp }]
3. Écart = monTimestamp - timestampDuLeaderÀCetteDistance
4. Adjacents : même logique avec coureur devant/derrière

Règles :
- 1 ticket = 1 commit
- Logique métier dans src/lib/, hooks dans src/hooks/, API dans src/app/api/
- Prisma pour toutes les requêtes DB (pas de SQL brut)
- SSE : broadcast via le manager (pas de Supabase Realtime)
- Geofencing côté serveur uniquement
- Tests unitaires obligatoires pour chaque module lib/
- Module time-gap : couverture > 90%

Confirme lecture, puis attends un numéro de ticket.
```

---

## Partie 4 : Ordre d'exécution

```
SEMAINE 1 — Fenêtre 1 seule
  P1.01 → P1.10

SEMAINES 2-3 — Fenêtres 2 et 3 en parallèle
  Fenêtre 2: P2.01 → P2.10
  Fenêtre 3: P4.01 → P4.03, P2.07 (parser GPX)

SEMAINES 3-4 — Fenêtre 1 pour l'admin
  P3.01 → P3.07

SEMAINES 4-6 — Fenêtres 2 et 3 en parallèle
  Fenêtre 3: P4.04 → P4.07, P5.01
  Fenêtre 2: P4.08 (carte live)
  Fenêtre 3: P4.09 (mode course), P5.02

SEMAINES 6-8 — Fenêtres 2 et 3
  Fenêtre 2: P5.03, P6.02, P6.04
  Fenêtre 3: P6.01, P6.03

SEMAINES 8-10 — Polish
  P7.01 (test terrain — toi sur un vélo)
  Fenêtre 2: P7.02, P7.03
  Fenêtre 1: P7.04 (déploiement prod)
```

---

## Partie 5 : Premier lancement pas à pas

### 1. Place les docs dans le repo
```bash
cd tdf2026-live
mkdir -p docs

# Copie les fichiers téléchargés :
# → docs/TDF2026_LiveApp_Spec_v3.md
# → docs/TDF2026_LiveApp_Annexes_v3.md
# → docs/TDF2026_LiveApp_Backlog_v3.md
# → CLAUDE.md        (racine)
# → TESTING.md       (racine)

git add .
git commit -m "docs: spec, backlog, CLAUDE.md, TESTING.md"
git push
```

### 2. Ouvre Claude Code — Fenêtre 1
1. Colle le prompt "Fenêtre 1 — Fondations"
2. Dis : **"Fais le ticket P1.01"**
3. Claude Code crée le projet Next.js
4. Lance `npm install` puis `npm run dev`
5. Vérifie localhost:3000
6. `git add . && git commit -m "[P1.01] Initialiser le projet Next.js" && git push`
7. **"Fais le ticket P1.02"**
8. Continue...

### 3. Au ticket P1.04 (Prisma)
Claude Code va te demander de :
```bash
# Les credentials DATABASE_URL sont dans tes notes
# Claude Code créera le .env.local avec
npm install prisma @prisma/client
npx prisma migrate dev --name init
npx prisma generate
npx prisma studio   # Pour vérifier visuellement
```

### 4. Fin de la Phase 1
Quand les 10 tickets P1.xx sont faits :
- L'app tourne en local avec les données mock
- `npx prisma studio` montre toutes les tables remplies
- Auth admin et coureur fonctionnent
- Upload R2 fonctionne
- SSE endpoint connecte (heartbeat)
→ Prêt à ouvrir les Fenêtres 2 et 3

---

## Partie 6 : Connexion Railway pour le déploiement (Phase 7)

Quand tu es prêt à déployer :
1. Dashboard Railway → projet tdf2026-live
2. **Add Service** → **GitHub Repo** → sélectionne `tdf2026-live`
3. Railway détecte Next.js automatiquement
4. Ajoute les variables d'env (toutes celles de `.env.local` sauf DATABASE_URL qui est déjà injectée par Railway)
5. Dans **Settings** du web service → **Build Command** : `npx prisma migrate deploy && npm run build`
6. Railway build et deploy automatiquement à chaque push sur main
