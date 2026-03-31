# TDF 2026 — Annexes Spec v3

## Annexe A — Direction Artistique

*(Identique à la v2 — aucun changement, la DA ne dépend pas de l'infra)*

### A.1 Palette de couleurs

```
PRINCIPALES
  Jaune Ricard (primaire)     #F2C200
  Bleu Nuit (secondaire)      #1B1F3B
  Blanc Cassé (fond)          #FAF8F0
  Noir Charbon (texte)        #1A1A1A

ÉQUIPES
  Visma Lease a Ricard        #F2C200  (Jaune)
  EAU Team Pastis             #E8E0D0  (Blanc cassé)
  Groupama Féd. du Jaune      #0055A4  (Bleu)
  INEOS Anisés                #E03C31  (Rouge)

ACCENTS
  Anis Vert (succès)          #8DB600
  Orange Pastis (warning)     #E88B00
  Rouge Effort (danger)       #D32F2F

FONDS
  Fond principal              #FAF8F0  (blanc crème)
  Fond carte / sombre         #1B1F3B  (bleu nuit)
  Fond mode course            #0D0D0D  (noir pur)
  Surface / card              #FFFFFF
  Surface secondaire          #F5F0E1  (beige doux)
```

### A.2 Typographie

| Usage | Font | Style |
|-------|------|-------|
| Titres / Noms d'équipe | Bebas Neue ou Oswald | Bold, uppercase, condensé |
| Corps de texte | Inter ou DM Sans | Clean, lisible |
| Chiffres / Temps | JetBrains Mono ou Space Mono | Monospace |
| Mode course (gros chiffres) | Bebas Neue 36-72px | Lisible à 30 km/h |

### A.3 Principes UI

- Mobile-first, toujours
- Classement par équipe = classement principal, affiché en premier
- Jaune Ricard = couleur d'accent (boutons, highlights)
- Mode course = thème noir pur avec grands chiffres
- Indicateur "LIVE" = pastille rouge clignotante

---

## Annexe B — Guide de Setup

### B.1 Comptes à créer / vérifier

| Étape | Service | Action | Temps |
|-------|---------|--------|-------|
| 1 | **GitHub** | Créer un repo `tdf2026-live` (public) | 3 min |
| 2 | **Railway** | Tu as déjà un compte. Créer un nouveau projet "tdf2026-live" dans ton dashboard. Ajouter un service PostgreSQL. Noter la `DATABASE_URL`. | 5 min |
| 3 | **Cloudflare R2** | Tu as déjà un bucket. Créer un nouveau bucket "tdf2026" (ou réutiliser l'existant). Noter les clés API S3. | 5 min |
| 4 | **MapTiler** | Créer un compte gratuit sur maptiler.com. Copier la clé API. | 3 min |

### B.2 Créer le projet Railway

1. Va dans ton dashboard Railway → **New Project**
2. Clique **"Provision PostgreSQL"** → une base est créée
3. Note la variable `DATABASE_URL` (visible dans l'onglet "Variables" du service PostgreSQL)
4. Clique **"New Service"** → **"GitHub Repo"** → sélectionne `tdf2026-live`
5. Railway va auto-détecter Next.js et configurer le build
6. Dans les variables du web service, ajoute toutes les variables d'env (voir B.4)

### B.3 Setup local

```bash
# Vérifier Node.js
node --version    # v18+ ou v20+

# Cloner le repo
git clone https://github.com/TON_USERNAME/tdf2026-live.git
cd tdf2026-live

# À partir de là, Claude Code prend le relais
```

### B.4 Variables d'environnement

```env
# PostgreSQL (depuis Railway → service PostgreSQL → Variables → DATABASE_URL)
DATABASE_URL=postgresql://postgres:xxx@xxx.railway.internal:5432/railway

# Auth.js
NEXTAUTH_SECRET=            # Claude Code le générera (openssl rand -base64 32)
NEXTAUTH_URL=http://localhost:3000   # En dev. En prod : URL Railway

# JWT coureurs
JWT_SECRET=                 # Claude Code le générera

# Cloudflare R2 (depuis Cloudflare dashboard → R2 → API Tokens)
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=tdf2026
R2_PUBLIC_URL=https://pub-xxx.r2.dev   # URL publique du bucket

# MapTiler
NEXT_PUBLIC_MAPTILER_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### B.5 Récapitulatif — Avant de lancer Claude Code

| ✅ | Élément |
|----|---------|
| ☐ | Repo GitHub créé |
| ☐ | Projet Railway créé avec PostgreSQL |
| ☐ | DATABASE_URL notée |
| ☐ | Bucket R2 prêt, clés API notées |
| ☐ | Clé MapTiler notée |
| ☐ | Node.js v18+ installé |
| ☐ | Repo cloné en local |

---

## Annexe C — Checklist de données à collecter

*(Identique à la v2)*

### Maintenant
- [ ] Envoyer le questionnaire fun facts aux 34 participants
- [ ] Photos des participants (ou attendre le camp d'entraînement)

### Avant le 15 mai
- [ ] Noms définitifs des 4 équipes (vote)
- [ ] Logos / visuels des équipes

### Avant le 13-14 juin
- [ ] Répartition coureurs/équipes (tirage)
- [ ] Inscription par étape
- [ ] Test terrain de l'app GPS

### Avant le 15 juillet
- [ ] 6 fichiers GPX uploadés
- [ ] Checkpoints configurés
- [ ] Liens coureurs générés et envoyés
- [ ] Test final E2E

---

*Annexes v3.0 — Stack Railway*
