# Stratégie de test — TDF 2026 Live Tracker (v3)

## Philosophie

Le cœur critique (GPS, écarts en temps, classements) doit être testé en profondeur. Le reste est testé visuellement.

---

## 1. Pyramide de tests

| Niveau | Outil | Quantité | Quoi tester |
|--------|-------|----------|-------------|
| **Unitaire** | Vitest | ~40-50 | Logique pure : GPS, géo, écarts, classements, formatters |
| **Intégration** | Vitest + Prisma (DB test) | ~20 | API routes, auth, pipeline GPS complet |
| **E2E** | Playwright | 2-3 scénarios | Parcours critiques end-to-end |
| **Manuel** | Checklist par phase | 7 checklists | Vérification visuelle, UX, responsive |
| **Terrain** | Sortie vélo réelle | 1-2 sessions | GPS réel, offline, batterie, lisibilité |

---

## 2. Tests unitaires

### Setup

Vitest avec config dans `vitest.config.ts`. Tests dans `src/__tests__/unit/`.

### Modules à tester

#### `src/lib/utils/haversine.ts`
- Distance Paris → Marseille (~660 km ± 5 km)
- Distance nulle (même point) → 0
- Distance très courte (50m) → ~50m ± 2m

#### `src/lib/gpx/parser.ts`
- Parse GPX valide → tableau de coordonnées
- Parse GPX sans élévation → coordonnées OK, élévation null
- Parse GPX vide → tableau vide
- Parse fichier invalide → erreur propre
- Calcul distance totale → ± 1% attendu
- Profil d'élévation → tableau {distance, elevation}

#### `src/lib/gpx/projection.ts`
- Point sur la trace → distance curviligne exacte
- Point à 10m → projection correcte
- Point à 500m → retourne la projection la plus proche
- Point au début → distanceFromStart = 0
- Point à la fin → distanceFromStart = totalDistance

#### `src/lib/gps/geofence.ts`
- Point dans le rayon → true
- Point hors du rayon → false
- Point sur la limite → true (inclusif)

#### `src/lib/gps/tracker.ts` (filtres)
- Accuracy < 50m → acceptée
- Accuracy > 50m → rejetée
- Vitesse > 80 km/h → rejetée
- Distance < 2m → rejetée (immobile)

#### `src/lib/time-gap/calculator.ts` (CRITIQUE — couverture > 90%)
- Leader seul → "LEADER"
- Deux coureurs, écart simple → "+2:30" correct
- Trois coureurs, adjacents → devant/derrière corrects
- Dépassement → nouveau leader
- Pas de données → "—"
- Même position → "+0:00"

#### `src/lib/time-gap/progression-history.ts`
- Ajout + lookup exact → timestamp correct
- Lookup avec interpolation → valeur interpolée
- Lookup hors bornes → null
- Historique vide → null

#### `src/lib/standings/calculator.ts`
- Classement étape individuel → rangs corrects
- CLM équipe (N=3) → temps = 3ème coureur
- Classement équipe (top 3) → somme des 3 meilleurs
- GC mode "all" → tous classés
- GC mode "complete_only" → partiels exclus
- DNF → exclu de l'étape

#### `src/lib/utils/formatters.ts`
- 154 sec → "+2:34"
- -90 sec → "-1:30"
- 0 → "+0:00"
- 3754 sec → "+1:02:34"
- 12345 m → "12.3 km"
- null (leader) → "LEADER"

### Exécution

```bash
npm run test                # Tous les tests unitaires
npm run test:watch          # Mode watch
npm run test -- --coverage  # Avec couverture
```

---

## 3. Tests d'intégration

### Setup

Tests d'intégration avec une base PostgreSQL de test. Prisma pointe vers une base dédiée via `DATABASE_URL` en env de test.

```bash
# Créer une base de test locale ou sur Railway
# Appliquer les migrations
npx prisma migrate deploy

# Lancer les tests
npm run test:integration
```

Chaque test : seed → appel API → vérification → cleanup.

### Scénarios

#### Auth
- Token coureur valide → 200 + données coureur
- Token invalide → erreur
- Token expiré → erreur
- Admin authentifié → accès /admin
- Non authentifié → redirect login

#### Ingestion GPS
- Batch valide → 200, positions en DB (vérifier via Prisma)
- Token manquant → 401
- Étape pas live → 400
- Coureur pas inscrit → 400
- Batch massif (50 positions) → 200

#### Pipeline complet
- Positions passant un checkpoint → TimeRecord créé
- Double passage → un seul TimeRecord
- Positions en retard → TimeRecord avec bon timestamp

#### CRUD admin
- Créer coureur → 201
- Modifier fun_facts → 200, JSONB mis à jour
- Upload GPX → 200, URL en DB

---

## 4. Tests E2E (Playwright)

### Scénario 1 : Parcours spectateur
Accueil → équipe → coureur → étapes → étape détail → classements

### Scénario 2 : Admin → résultats
Login admin → config étape → inscrire coureurs → démarrer → (simuler GPS) → vérifier TimeRecord → valider résultats → classement public

### Scénario 3 : Live tracking (simulé)
Page live spectateur + script d'envoi GPS parallèle → marqueurs sur la carte → écarts affichés

```bash
npm run test:e2e
npm run test:e2e -- --ui     # Mode debug graphique
```

---

## 5. Checklists manuelles par phase

### Phase 1
- [ ] `npm run dev` fonctionne
- [ ] `npx prisma studio` montre les tables avec les données mock
- [ ] Auth admin fonctionne (login/logout)
- [ ] Auth coureur fonctionne (lien personnel)
- [ ] Upload fichier vers R2 fonctionne
- [ ] PWA détectée dans DevTools

### Phase 2
- [ ] Toutes les pages publiques s'affichent
- [ ] Données depuis Prisma (pas hardcodées)
- [ ] Carte avec GPX + checkpoints
- [ ] Profil d'élévation correct
- [ ] Responsive 375px / 1440px

### Phase 3
- [ ] CRUD coureur/équipe fonctionnel
- [ ] Upload GPX → preview carte
- [ ] Checkpoints ajoutables en cliquant sur la carte
- [ ] Matrice inscriptions fonctionnelle
- [ ] Démarrer/arrêter étape

### Phase 4
- [ ] Tracking GPS sur mobile réel
- [ ] Positions sur la carte live (autre onglet)
- [ ] Écarts en temps affichés et cohérents
- [ ] Mode course lisible
- [ ] Offline → buffer → resync
- [ ] Checkpoints détectés auto

### Phase 5
- [ ] Classements corrects
- [ ] Équipe en premier
- [ ] Admin peut corriger un temps
- [ ] CLM équipe calcul correct

### Phase 6
- [ ] Poster dans le fil depuis mobile
- [ ] Post apparaît en temps réel (SSE)
- [ ] Replay : chargement, play, vitesse, scrub

### Phase 7
- [ ] Test terrain GPS réel OK
- [ ] Lighthouse > 80
- [ ] App en prod sur Railway

---

## 6. Test terrain — Protocole

- **Quand** : début juillet (2 semaines avant le voyage)
- **Qui** : 2-3 personnes, téléphones iOS + Android
- **Parcours** : 30-60 min avec une montée

### Scénario
1. Upload GPX, config checkpoints (start, sommet, finish)
2. Inscrire les testeurs, démarrer l'étape
3. Rouler. Un testeur active le mode avion 5 min en route
4. Un spectateur suit depuis la maison
5. Après : vérifier sync, TimeRecords, classement, replay

### Seuils
| Point | Seuil | Si KO |
|-------|-------|-------|
| Batterie/h | < 15% | Réduire fréquence GPS |
| Latence carte | < 10 sec | Vérifier SSE |
| Précision GPS | Trace sans zigzags | Ajuster filtres |
| Geofence | 100% détectés | Augmenter rayon |
| Sync offline | Tout arrive | Vérifier retry |

---

## 7. Scripts de simulation

```bash
# Simuler 1 coureur sur un GPX
npx ts-node scripts/simulate-rider.ts --token <token> --gpx <file> --speed 25

# Simuler une course avec 5 coureurs
npx ts-node scripts/simulate-race.ts --stage-id <uuid> --riders 5 --speed-range 20-35

# Seed des résultats fictifs (pour tester les classements)
npx ts-node scripts/seed-results.ts --stage-id <uuid>
```

---

## 8. Couverture de code

| Module | Cible | Raison |
|--------|-------|--------|
| `lib/time-gap/` | > 90% | Critique : écarts faux = coureurs perdus |
| `lib/gps/` | > 85% | Critique : positions perdues |
| `lib/gpx/` | > 80% | Important : carte/profil cassés |
| `lib/standings/` | > 85% | Important : classements faux |
| `lib/utils/` | > 90% | Simple à tester |
| `lib/auth/` | > 80% | Sécurité |
| `components/` | pas de cible | Testé visuellement |

---

*TESTING v3.0 — Stack Railway + Prisma*
