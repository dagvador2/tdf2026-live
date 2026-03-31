# TDF 2026 — Backlog d'implémentation v3
## Tickets atomiques — Stack Railway + Prisma + Auth.js + SSE + R2

> Chaque ticket = 1 commit. Message : `[P{phase}.{num}] Titre`. L'app doit compiler après chaque commit.

---

# PHASE 1 — Setup & Fondations (10 tickets)

### [P1.01] Initialiser le projet Next.js
Dépend de : rien
─────────────────
Créer le projet Next.js 14 App Router + TypeScript + Tailwind CSS. Configurer ESLint, alias `@/`. Fichier `.gitignore`, `.env.local.example`.

Fichiers : `package.json`, `tsconfig.json`, `tailwind.config.ts`, `next.config.js`, `src/app/layout.tsx` (avec `<html lang="fr">`), `src/app/page.tsx` (placeholder "TDF 2026"), `.gitignore`, `.env.local.example`

✅ `npm run dev` → localhost:3000 affiche "TDF 2026"
✅ Tailwind fonctionne, TypeScript compile

---

### [P1.02] Installer shadcn/ui avec thème Jaune Ricard
Dépend de : P1.01
──────────────────
Configurer shadcn/ui. Variables CSS custom (jaune `#F2C200`, bleu nuit `#1B1F3B`, blanc crème `#FAF8F0`). Installer composants : Button, Card, Badge, Input, Table, Dialog, Sheet, Tabs, Separator, Avatar.

Fichiers : `components.json`, `src/lib/utils.ts`, `src/app/globals.css`, `src/components/ui/*`

✅ Bouton jaune visible sur la page d'accueil
✅ Les variables CSS correspondent à la DA

---

### [P1.03] Configurer la PWA
Dépend de : P1.01
──────────────────
Installer `@ducanh2912/next-pwa`. Manifest avec nom, couleurs, icônes placeholder. Service worker basique.

Fichiers : `next.config.js` (PWA), `public/manifest.json`, `public/icons/` (192x192 + 512x512), `src/app/layout.tsx` (meta PWA)

✅ DevTools > Application > Manifest détecté
✅ Service Worker enregistré
✅ `theme-color` = jaune Ricard

---

### [P1.04] Configurer Prisma + PostgreSQL Railway
Dépend de : P1.01
──────────────────
Installer Prisma. Créer le schéma complet (`prisma/schema.prisma`) avec tous les models, enums, relations et index. Générer la première migration. Créer le client Prisma singleton.

Fichiers : `prisma/schema.prisma`, `prisma/migrations/` (auto), `src/lib/db.ts` (singleton Prisma client)

Commandes à lancer :
```bash
npm install prisma @prisma/client
npx prisma migrate dev --name init
npx prisma generate
```

✅ `npx prisma studio` ouvre le dashboard et montre toutes les tables
✅ Le schéma correspond au modèle de données de la spec (Team, Rider, Stage, StageEntry, Checkpoint, TimeRecord, GpsPosition, LivePost, AdminUser)
✅ Les index sont créés (gps_positions sur entry_id+timestamp, etc.)
✅ `import { prisma } from '@/lib/db'` fonctionne

---

### [P1.05] Seed des données mock
Dépend de : P1.04
──────────────────
Script TypeScript de seed : 4 équipes, 34 coureurs (vrais prénoms) répartis ~8-9 par équipe, 6 étapes avec infos réelles, ~4-6 checkpoints par étape, quelques StageEntry pour tester.

Fichiers : `prisma/seed.ts`, mise à jour `package.json` (script prisma seed)

Commande : `npx prisma db seed`

✅ 4 équipes en base
✅ 34 coureurs avec équipe, fun facts placeholder
✅ 6 étapes avec dates, distances, D+, type
✅ Checkpoints avec coordonnées GPS réalistes
✅ Quelques stage_entries existent (20 coureurs inscrits à l'étape 1)

---

### [P1.06] Configurer Auth.js (NextAuth v5) pour les admins
Dépend de : P1.04
──────────────────
Installer Auth.js v5. Credentials provider (email + password). Hashage bcrypt. Middleware Next.js protégeant `/admin/*`. Page de login admin.

Fichiers : `src/lib/auth/config.ts` (Auth.js config), `src/app/api/auth/[...nextauth]/route.ts`, `src/middleware.ts`, `src/app/admin/login/page.tsx`

✅ `/admin` sans session → redirige vers `/admin/login`
✅ Login avec les credentials du seed → accès `/admin`
✅ Logout → retour au login
✅ Le mot de passe est hashé en base (bcrypt)

---

### [P1.07] Auth coureur — JWT custom
Dépend de : P1.04
──────────────────
Fonctions `signJWT(riderId)` et `verifyJWT(token)`. API route admin pour générer un lien coureur. Page `/coureur/[token]` qui vérifie le token et affiche le prénom.

Fichiers : `src/lib/auth/jwt.ts`, `src/app/api/admin/generate-rider-token/route.ts`, `src/app/coureur/[token]/page.tsx`

✅ Token valide → "Bienvenue [prénom]"
✅ Token invalide → erreur "Lien invalide"
✅ Token expiré → erreur "Lien expiré"

---

### [P1.08] Client Cloudflare R2 (upload fichiers)
Dépend de : P1.01
──────────────────
Configurer le client S3 pour Cloudflare R2. API route `/api/upload` pour uploader un fichier (photo, GPX, logo) et retourner l'URL publique.

Fichiers : `src/lib/storage/r2.ts` (client S3), `src/app/api/upload/route.ts`

✅ Upload d'un fichier test → URL publique retournée
✅ Le fichier est accessible via l'URL
✅ Les variables R2 sont dans `.env.local`

---

### [P1.09] Utilitaires et constantes
Dépend de : P1.01
──────────────────
Créer les utilitaires partagés : formatters (temps, distance, élévation), constantes (couleurs équipes, fun facts fields), types TypeScript.

Fichiers : `src/lib/utils/formatters.ts`, `src/lib/utils/constants.ts`, `src/types/index.ts`

✅ `formatTime(154)` → "+2:34"
✅ `formatDistance(12345)` → "12.3 km"
✅ `FUN_FACT_FIELDS` exporté avec les 11 questions
✅ `TEAM_COLORS` exporté
✅ Types TypeScript pour les entités principales

---

### [P1.10] SSE Manager — Squelette
Dépend de : P1.01
──────────────────
Créer le SSE Connection Manager (singleton côté serveur) et l'endpoint `/api/live/stream`. Créer le hook client `useSSE`. Pour l'instant, le manager ne broadcast rien — juste l'infra de connexion/déconnexion + heartbeat.

Fichiers : `src/lib/sse/manager.ts`, `src/lib/sse/events.ts` (types d'événements), `src/app/api/live/stream/route.ts`, `src/hooks/useSSE.ts`

✅ Un client peut se connecter à `/api/live/stream?stageId=xxx`
✅ Le client reçoit un heartbeat (ping) toutes les 30 secondes
✅ La déconnexion est gérée proprement (stream retiré du Set)
✅ `useSSE('/api/live/stream?stageId=xxx')` retourne `{ connected, data }`

---

# PHASE 2 — Vitrine publique (10 tickets)

### [P2.01] Layout global et navigation
Dépend de : P1.02
──────────────────
Header (logo, nav desktop), footer, bottom bar mobile (Accueil, Équipes, Étapes, Classements, Actu). Typo Bebas Neue / Oswald pour les titres.

Fichiers : `src/app/layout.tsx`, `src/components/layout/Header.tsx`, `src/components/layout/Footer.tsx`, `src/components/layout/MobileNav.tsx`, `src/components/layout/Logo.tsx`

✅ Navigation fonctionne (liens vers les bonnes pages)
✅ Bottom bar sur mobile, nav horizontale sur desktop
✅ Couleurs DA respectées

---

### [P2.02] Page d'accueil
Dépend de : P2.01, P1.05
─────────────────────────
Hero, compteur J-X, grille des 4 équipes (depuis Prisma), chiffres clés, lien prochaine étape.

Fichiers : `src/app/page.tsx`, `src/components/home/HeroSection.tsx`, `src/components/home/CountdownBanner.tsx`, `src/components/home/TeamGrid.tsx`, `src/components/home/StatsBar.tsx`

✅ Compteur J-X correct (20 juillet 2026)
✅ 4 équipes affichées depuis la DB
✅ Responsive mobile/desktop

---

### [P2.03] Page liste des équipes
Dépend de : P2.01, P1.05

Fichiers : `src/app/equipes/page.tsx`, `src/components/teams/TeamCard.tsx`

✅ 4 équipes en cards avec couleur, nb coureurs
✅ Clic → `/equipes/{slug}`

---

### [P2.04] Page détail d'une équipe
Dépend de : P2.03

Fichiers : `src/app/equipes/[slug]/page.tsx`, `src/components/teams/TeamHeader.tsx`, `src/components/teams/RiderMiniCard.tsx`

✅ Nom, couleur, description, liste coureurs
✅ Clic coureur → `/coureurs/{slug}`
✅ 404 si slug inexistant

---

### [P2.05] Fiche coureur
Dépend de : P2.04

Fichiers : `src/app/coureurs/[slug]/page.tsx`, `src/components/riders/RiderProfile.tsx`, `src/components/riders/FunFacts.tsx`, `src/components/riders/StageParticipation.tsx`, `src/components/riders/AvatarInitials.tsx`

✅ Photo ou avatar initiales, fun facts, participation par étape
✅ Badge équipe cliquable

---

### [P2.06] Programme des étapes
Dépend de : P2.01, P1.05

Fichiers : `src/app/etapes/page.tsx`, `src/components/stages/StageTimeline.tsx`, `src/components/stages/StageCard.tsx`, `src/components/stages/StageTypeBadge.tsx`

✅ 6 étapes en timeline, date/nom/type/distance/D+
✅ Clic → `/etapes/{id}`

---

### [P2.07] Parser GPX et utilitaires géo
Dépend de : P1.01

Fichiers : `src/lib/gpx/parser.ts`, `src/lib/utils/haversine.ts`, `src/lib/gpx/projection.ts`

✅ Parse GPX → { coordinates, elevationProfile, totalDistance }
✅ Haversine correct (test avec valeur connue)
✅ Projection sur polyline → { distanceFromStart }
✅ Tests unitaires (≥ 7 tests)

---

### [P2.08] Composant carte MapLibre
Dépend de : P2.07

Fichiers : `src/components/map/MapContainer.tsx`, `src/components/map/GPXTrace.tsx`, `src/components/map/CheckpointMarker.tsx`, `src/lib/map/config.ts`

✅ Carte avec tuiles MapTiler
✅ Trace GPX en polyline colorée
✅ Checkpoints en marqueurs (icône selon type)
✅ Auto-zoom sur la trace
✅ Responsive

---

### [P2.09] Composant profil d'élévation
Dépend de : P2.07

Fichiers : `src/components/elevation/ElevationProfile.tsx`

✅ Graphique Recharts (distance X, altitude Y)
✅ Checkpoints marqués sur le profil
✅ Dégradé sous la courbe
✅ Responsive

---

### [P2.10] Page détail d'une étape
Dépend de : P2.06, P2.08, P2.09

Fichiers : `src/app/etapes/[id]/page.tsx`, `src/components/stages/StageDetail.tsx`, `src/components/stages/StageInfo.tsx`, `src/components/stages/RegisteredRiders.tsx`

✅ Carte + profil d'élévation + infos étape
✅ Liste des coureurs inscrits
✅ Placeholder "Résultats à venir" si pas terminée

---

# PHASE 3 — Administration (7 tickets)

### [P3.01] Dashboard admin
Dépend de : P1.06

Fichiers : `src/app/admin/page.tsx`, `src/app/admin/layout.tsx`, `src/components/admin/AdminSidebar.tsx`, `src/components/admin/DashboardStats.tsx`

✅ Stats depuis Prisma, sidebar navigation, accès protégé

---

### [P3.02] CRUD Équipes
Dépend de : P3.01

Fichiers : `src/app/admin/equipes/page.tsx`, `src/components/admin/teams/TeamForm.tsx`, `src/components/admin/teams/TeamList.tsx`

✅ Liste, créer, modifier (nom, couleur, description), upload logo → R2

---

### [P3.03] CRUD Coureurs
Dépend de : P3.01

Fichiers : `src/app/admin/coureurs/page.tsx`, `src/components/admin/riders/RiderForm.tsx`, `src/components/admin/riders/RiderList.tsx`, `src/components/admin/riders/FunFactsForm.tsx`

✅ CRUD complet, upload photo → R2, formulaire fun facts (11 champs)
✅ Génération lien coureur (JWT)

---

### [P3.04] Gestion étapes — Config & GPX
Dépend de : P3.01, P2.07

Fichiers : `src/app/admin/etapes/page.tsx`, `src/app/admin/etapes/[id]/page.tsx`, `src/components/admin/stages/StageConfigForm.tsx`, `src/components/admin/stages/GPXUpload.tsx`

✅ Upload GPX → R2, preview carte + profil d'élévation
✅ Modifier tt_nth_rider, team_top_n, gc_mode

---

### [P3.05] Gestion checkpoints (geofences)
Dépend de : P3.04

Fichiers : `src/components/admin/stages/CheckpointEditor.tsx`, `src/components/admin/stages/CheckpointForm.tsx`, `src/components/map/CheckpointPlacer.tsx`

✅ Ajouter checkpoint en cliquant sur la carte
✅ Modifier nom, type, rayon. Supprimer.
✅ Rayon affiché comme cercle sur la carte

---

### [P3.06] Matrice inscription coureurs × étapes
Dépend de : P3.01

Fichiers : `src/app/admin/inscriptions/page.tsx`, `src/components/admin/entries/EntryMatrix.tsx`

✅ Grille coureurs × 6 étapes, cases cochables
✅ Compteur par étape, filtre par équipe

---

### [P3.07] Contrôle d'étape (démarrer / arrêter)
Dépend de : P3.04

Fichiers : `src/components/admin/stages/StageControls.tsx`

✅ Boutons : Démarrer (upcoming→live), Pause (live→paused), Reprendre (paused→live), Terminer (→finished)
✅ Confirmation avant chaque changement
✅ start_time enregistré au démarrage
✅ Événement `stage_status` envoyé via SSE

---

# PHASE 4 — Live Tracker & Écarts en temps (9 tickets)

### [P4.01] Hook GPS Tracker côté client
Dépend de : P1.01

Fichiers : `src/hooks/useGPSTracker.ts`, `src/lib/gps/tracker.ts`

✅ watchPosition haute précision, throttle 5 sec
✅ Filtres qualité (accuracy, vitesse, distance)
✅ États : idle/tracking/paused/error
✅ WakeLock actif pendant le tracking

---

### [P4.02] Buffer GPS IndexedDB
Dépend de : P4.01

Fichiers : `src/lib/gps/buffer.ts`

✅ Stockage dans IndexedDB (lib `idb`), flag `synced`
✅ getUnsyncedPositions, markAsSynced, getCount

---

### [P4.03] Sync GPS vers le serveur
Dépend de : P4.02

Fichiers : `src/lib/gps/sync.ts`, `src/hooks/useGPSSync.ts`, `src/hooks/useOnlineStatus.ts`

✅ Online : batch POST /15 sec
✅ Offline : accumulation IndexedDB
✅ Retour réseau : backlog par paquets de 50
✅ Statut exposé : online / buffering / syncing

---

### [P4.04] Endpoint d'ingestion GPS
Dépend de : P1.07, P1.04

Fichiers : `src/app/api/gps/batch/route.ts`

✅ JWT invalide → 401
✅ Étape pas live → 400
✅ Coureur pas inscrit → 400
✅ Positions valides → `prisma.gpsPosition.createMany()` → 200
✅ StageEntry passe en "tracking" au premier batch
✅ Réponse < 200ms

---

### [P4.05] Détection geofence des checkpoints
Dépend de : P4.04, P1.05

Fichiers : `src/lib/gps/geofence.ts`, modification de `src/app/api/gps/batch/route.ts`

✅ Position dans le rayon → TimeRecord créé
✅ Pas de doublon (unique entryId + checkpointId)
✅ Checkpoints vérifiés dans l'ordre
✅ Fonctionne avec des positions en retard (offline sync)

---

### [P4.06] Calcul des écarts en temps — Module core
Dépend de : P2.07, P4.04

Fichiers : `src/lib/time-gap/calculator.ts`, `src/lib/time-gap/progression-history.ts`, `src/lib/time-gap/types.ts`

✅ Projection sur GPX → distanceFromStart
✅ Historique progression en mémoire
✅ Lookup interpolé → écart en secondes
✅ Écarts adjacents (devant/derrière)
✅ Gère : "LEADER", "—" (pas de données), "+0:00" (même position)
✅ Tests unitaires ≥ 10 tests, couverture > 90%

---

### [P4.07] Broadcast positions + écarts via SSE
Dépend de : P4.04, P4.06, P1.10

Fichiers : modification de `src/app/api/gps/batch/route.ts`, `src/lib/sse/manager.ts`

✅ Après traitement d'un batch : push snapshot via SSE
✅ Payload : { stageId, timestamp, riders: [{ id, firstName, teamColor, lat, lng, speed, distFromStart, timeGapToLeader, riderAhead, riderBehind }] }
✅ Seules les étapes "live" émettent
✅ Les clients connectés reçoivent le snapshot

---

### [P4.08] Carte live spectateur
Dépend de : P2.08, P4.07

Fichiers : `src/app/etapes/[id]/live/page.tsx`, `src/components/live/LiveMap.tsx`, `src/components/live/RiderMarker.tsx`, `src/components/live/RiderPopup.tsx`, `src/components/live/LiveElevation.tsx`, `src/hooks/useLivePositions.ts`

✅ Marqueurs colorés par équipe, animés, via SSE
✅ Clic → popup avec nom, vitesse, écart
✅ Profil d'élévation avec positions des coureurs
✅ Indicateur "LIVE" clignotant
✅ Mise à jour temps réel (pas de refresh)

---

### [P4.09] Vue coureur — Mode course
Dépend de : P4.03, P4.07

Fichiers : `src/app/coureur/[token]/live/page.tsx`, `src/components/live/RiderDashboard.tsx`, `src/components/live/GapDisplay.tsx`, `src/components/live/NextCheckpoint.tsx`, `src/components/live/TrackingControls.tsx`, `src/components/live/ConnectionStatus.tsx`

✅ Mode sombre, polices ≥ 36px
✅ Écart au leader, coureur devant/derrière
✅ Distance parcourue/totale, vitesse, prochaine difficulté
✅ Bouton start/stop, indicateur connexion
✅ WakeLock actif, lisible en plein soleil

---

# PHASE 5 — Classements & Résultats (3 tickets)

### [P5.01] Logique de calcul des classements
Dépend de : P1.04

Fichiers : `src/lib/standings/calculator.ts`

✅ Classement étape individuel
✅ CLM équipe (N-ième coureur)
✅ Classement équipe par étape (somme N meilleurs)
✅ Classement général (3 modes A/B/C)
✅ Classement grimpeur
✅ Tests unitaires ≥ 6 tests

---

### [P5.02] Interface admin résultats
Dépend de : P3.01, P5.01

Fichiers : `src/app/admin/resultats/page.tsx`, `src/app/admin/resultats/[stageId]/page.tsx`, `src/components/admin/results/TimeRecordTable.tsx`, `src/components/admin/results/ManualTimeEntry.tsx`, `src/components/admin/results/ValidateButton.tsx`

✅ Voir temps auto-détectés, corriger, saisir manuellement
✅ Bouton "Valider résultats" → étape passe en "finished"

---

### [P5.03] Pages publiques classements
Dépend de : P5.01, P2.01

Fichiers : `src/app/classements/page.tsx`, `src/components/standings/TeamStandingsTable.tsx`, `src/components/standings/IndividualStandingsTable.tsx`, `src/components/standings/ClimberStandingsTable.tsx`, `src/components/standings/StandingsTabs.tsx`

✅ Classement équipe EN PREMIER
✅ Onglets : Équipe, Individuel, Grimpeur, Lanterne
✅ Responsive mobile

---

# PHASE 6 — Fil d'actualité & Replay (4 tickets)

### [P6.01] CRUD fil d'actualité (admin)
Dépend de : P3.01, P1.08

Fichiers : `src/app/admin/actu/page.tsx`, `src/components/admin/feed/PostComposer.tsx`, `src/components/admin/feed/PostList.tsx`

✅ Poster texte + photo (upload R2), épingler, supprimer
✅ Interface mobile-friendly
✅ Publication → push événement `feed` via SSE

---

### [P6.02] Feed public en temps réel
Dépend de : P6.01

Fichiers : `src/app/actu/page.tsx`, `src/components/feed/FeedList.tsx`, `src/components/feed/FeedPost.tsx`, `src/components/feed/PinnedPosts.tsx`, `src/hooks/useLiveFeed.ts`

✅ Feed inversé, posts épinglés en haut, badges de type
✅ Nouveau post apparaît en temps réel via SSE
✅ Filtrable par étape

---

### [P6.03] Mode replay — Chargement des données
Dépend de : P4.04, P6.02

Fichiers : `src/app/etapes/[id]/replay/page.tsx`, `src/lib/replay/loader.ts`, `src/lib/replay/types.ts`

✅ Charge GpsPosition + TimeRecord + LivePost via API
✅ Pagination si > 10k positions
✅ Données structurées en frames (par tranches de 5 sec)
✅ Indicateur de chargement

---

### [P6.04] Mode replay — Player et animation
Dépend de : P6.03, P4.08

Fichiers : `src/components/replay/ReplayPlayer.tsx`, `src/components/replay/ReplayControls.tsx`, `src/components/replay/ReplayFeed.tsx`, `src/hooks/useReplayEngine.ts`

✅ Play/pause, vitesse ×5/×10/×20/×50, scrub
✅ Marqueurs se déplacent sur la carte
✅ Posts du fil apparaissent au bon moment
✅ Passages de checkpoint marqués visuellement

---

# PHASE 7 — Polish & Tests terrain (4 tickets)

### [P7.01] Test terrain GPS (pas un commit code)
Dépend de : P4.09

Sortie vélo 30-60 min avec 2-3 téléphones. Tester tracking, offline, sync, écarts, lisibilité. Produit un rapport de bugs.

✅ Tracking fonctionne pendant toute la sortie
✅ Buffer offline → sync OK
✅ Écarts cohérents
✅ Batterie < 15%/h
✅ Mode course lisible sans s'arrêter

---

### [P7.02] Optimisation performances
Dépend de : tout

✅ Lighthouse Performance > 80 mobile
✅ Lazy loading carte et graphiques
✅ Images optimisées (next/image)
✅ Pagination des listes longues

---

### [P7.03] Identité visuelle finale
Dépend de : tout

✅ Toutes les pages visuellement cohérentes
✅ Animations fluides
✅ Thème jaune Ricard partout
✅ Mode course lisible au soleil

---

### [P7.04] Déploiement production Railway
Dépend de : tout

Setup projet Railway prod : web service (depuis GitHub) + PostgreSQL. Variables d'environnement. Domaine custom. Migrations Prisma. Seed prod. Test E2E complet.

✅ App accessible sur le domaine final
✅ HTTPS actif
✅ Données prod en place
✅ Liens coureurs générés et envoyés
✅ Test complet : GPS → carte → classements

---

# Récapitulatif

| Phase | Tickets | Estimation |
|-------|---------|-----------|
| Phase 1 — Setup & Fondations | 10 | Semaine 1 |
| Phase 2 — Vitrine publique | 10 | Semaines 2-3 |
| Phase 3 — Administration | 7 | Semaines 3-4 |
| Phase 4 — Live Tracker & Écarts | 9 | Semaines 4-6 |
| Phase 5 — Classements & Résultats | 3 | Semaines 6-7 |
| Phase 6 — Fil d'actualité & Replay | 4 | Semaines 7-8 |
| Phase 7 — Polish & Tests | 4 | Semaines 8-10 |
| **Total** | **47 tickets** | **~10 semaines** |
