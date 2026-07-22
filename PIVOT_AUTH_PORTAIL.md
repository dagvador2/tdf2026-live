# PIVOT — Auth coureur + Portail personnel
## Instructions pour Claude Code

> Ce document décrit un pivot majeur : on remplace l'auth coureur par token JWT dans l'URL par une vraie auth Google OAuth / Email magic link via Auth.js. Chaque coureur a un espace personnel où il remplit ses infos.

---

## 1. Ce qui change

### Avant (JWT dans l'URL)
- Le coureur reçoit un lien `app.tdf2026.fr/coureur/abc123`
- Le token identifie le coureur, pas de compte
- Les fun facts et infos sont remplis par l'admin
- Le coureur ne peut rien modifier lui-même

### Après (Google OAuth / Magic Link)
- Le coureur se connecte via Google ou par email (magic link)
- Il a un **espace personnel** où il remplit lui-même ses infos
- L'admin lie un compte Auth.js à un rider dans la base
- Le coureur peut modifier ses données à tout moment

---

## 2. Modifications Auth.js

### 2.1 Ajouter les providers Google et Email

Auth.js supporte déjà les Credentials (admins). On ajoute deux providers pour les coureurs :

```typescript
// src/lib/auth/config.ts
import GoogleProvider from "next-auth/providers/google"
import EmailProvider from "next-auth/providers/email"

providers: [
  // Admin (existant)
  CredentialsProvider({ ... }),

  // Coureur — Google
  GoogleProvider({
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  }),

  // Coureur — Email magic link
  EmailProvider({
    server: process.env.EMAIL_SERVER,      // SMTP (ex: Resend, SendGrid, Gmail SMTP)
    from: process.env.EMAIL_FROM,          // "TDF 2026 <noreply@tdf2026.fr>"
  }),
]
```

### 2.2 Adapter la session et les callbacks

Le callback `signIn` doit :
1. Laisser passer les admins (Credentials)
2. Pour Google/Email : vérifier si l'email est lié à un Rider dans la base
3. Si oui → connecter comme coureur
4. Si non → créer une entrée en attente (le coureur pourra remplir ses infos, l'admin le liera à un Rider plus tard)

Le callback `session` doit enrichir la session avec :
- `session.user.role` : "admin" | "rider" | "pending"
- `session.user.riderId` : l'ID du rider lié (si role = "rider")

### 2.3 Adapter le modèle Prisma

Auth.js avec les providers Google et Email nécessite des tables supplémentaires pour stocker les sessions et les comptes OAuth. Utiliser l'adaptateur Prisma officiel.

```prisma
// Ajouter au schema.prisma

model Account {
  id                String  @id @default(cuid())
  userId            String  @map("user_id")
  type              String
  provider          String
  providerAccountId String  @map("provider_account_id")
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@map("accounts")
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique @map("session_token")
  userId       String   @map("user_id")
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("sessions")
}

model User {
  id            String    @id @default(cuid())
  name          String?
  email         String?   @unique
  emailVerified DateTime? @map("email_verified")
  image         String?
  role          String    @default("pending") // "admin" | "rider" | "pending"
  riderId       String?   @unique @map("rider_id")
  rider         Rider?    @relation(fields: [riderId], references: [id])
  accounts      Account[]
  sessions      Session[]

  @@map("users")
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
  @@map("verification_tokens")
}

// Modifier le model Rider existant — ajouter la relation inverse
model Rider {
  // ... champs existants ...
  user User?  // Relation inverse : le User Auth.js lié à ce rider
}
```

**IMPORTANT** : Le model `AdminUser` existant reste en place pour l'instant mais sera progressivement remplacé par des `User` avec `role = "admin"`. Pour la migration, on garde les deux systèmes en parallèle puis on supprimera `AdminUser` quand tout est migré.

### 2.4 Nouvelles variables d'environnement

```env
# Google OAuth (depuis console.cloud.google.com > APIs & Services > Credentials)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Email magic link (service SMTP)
# Option simple : utiliser Resend (gratuit jusqu'à 100 emails/jour)
EMAIL_SERVER=smtp://resend:re_xxxx@smtp.resend.com:465
EMAIL_FROM="TDF 2026 <noreply@tdf2026.fr>"
```

---

## 3. Portail coureur — Nouvelles pages

### 3.1 Page de connexion coureur

Route : `/connexion`

- Bouton "Se connecter avec Google"
- Champ email + bouton "Recevoir un lien de connexion"
- Design : plein écran, identité TDF 2026, simple et clair

### 3.2 Dashboard coureur (après connexion)

Route : `/mon-espace`

Page principale avec le statut du profil et des accès rapides :
- Indicateur de complétion du profil (barre de progression)
- Lien vers "Mes infos" (profil + fun facts)
- Lien vers "Mes étapes" (participation)
- Lien vers "Logistique" (transport)
- Si une étape est live → bouton direct vers le mode course

### 3.3 Page "Mes infos"

Route : `/mon-espace/profil`

Formulaire éditable par le coureur :

**Infos de base :**
| Champ | Type | Requis | Notes |
|-------|------|--------|-------|
| Prénom | text | ✅ | Pré-rempli depuis Google |
| Surnom | text | ❌ | |
| Photo | upload | ❌ | Pré-remplie depuis Google, modifiable |

**Infos sportives (visibles uniquement par l'admin) :**
| Champ | Type | Requis | Notes |
|-------|------|--------|-------|
| Poids (kg) | number | ❌ | Pour le calcul W/kg |
| FTP (watts) | number | ❌ | Pour l'équilibrage des équipes |
| Niveau estimé | select | ❌ | Débutant / Intermédiaire / Avancé / Compétiteur |

**Fun facts (visibles publiquement sur la fiche coureur) :**
Les 11 questions du questionnaire, chacune comme un champ texte :
- Coureur du Tour 2025 préféré
- Coureur all time préféré
- Souvenir du Tour le plus marquant
- Marque de vélo de rêve
- Col préféré déjà fait
- Pire souvenir à vélo
- Meilleur souvenir à vélo
- Surnom de ton vélo
- Chanson dans un col de l'enfer
- Boisson après 3000m de D+
- Excuse quand cramé en col

**IMPORTANT** : Les infos sportives (poids, FTP) ne sont PAS affichées publiquement. Elles sont uniquement visibles par l'admin pour l'équilibrage des équipes.

### 3.4 Page "Mes étapes"

Route : `/mon-espace/etapes`

Le coureur voit les 6 étapes et coche celles auxquelles il participe :

```
Étape 1 — Lun 20/07 — Sortie accidentée (75.5 km, 969m D+)
[✅ Je participe]

Étape 2 — Mar 21/07 — CLM par équipe (34.6 km, 219m D+)
[✅ Je participe]

Étape 3 — Mer 22/07 — CLM individuel (32.5 km, 174m D+)
[✅ Je participe]

Étape 4 — Jeu 23/07 — Col de la Croix de Fer (100.8 km, 2291m D+)
[➖ Je ne participe pas]

...
```

Quand le coureur coche/décoche → crée/supprime un `StageEntry`.

Afficher un résumé en haut : "Tu participes à X étapes sur 6"

### 3.5 Page "Logistique"

Route : `/mon-espace/logistique`

Formulaire pour les infos de transport/logistique :

| Champ | Type | Notes |
|-------|------|-------|
| Moyen d'arrivée | select | Voiture / Train / Covoiturage / Autre |
| Date d'arrivée | date | |
| Heure d'arrivée estimée | time | |
| Gare / Lieu d'arrivée | text | Ex: "Gare de Grenoble", "Gare de Voiron" |
| Besoin d'être récupéré ? | toggle | Oui / Non |
| Date de départ | date | |
| Nombre de places vélo dispo (si voiture) | number | |
| Nombre de places passager dispo (si voiture) | number | |
| Commentaire logistique | textarea | Infos complémentaires |

**Ces infos sont visibles par l'admin uniquement** (pour organiser les transferts).

### 3.6 Mode course (inchangé)

Route : `/mon-espace/course`

Identique à l'actuel `/coureur/[token]/live` mais accessible via la session Auth.js au lieu du token JWT. Le coureur est identifié par `session.user.riderId`.

---

## 4. Modifications du modèle Prisma

### 4.1 Nouveaux champs sur Rider

```prisma
model Rider {
  // ... champs existants ...

  // Infos sportives (admin only)
  weightKg      Float?   @map("weight_kg")
  ftpWatts      Int?     @map("ftp_watts")
  level         String?  // "beginner" | "intermediate" | "advanced" | "competitor"

  // Logistique
  logistics     Json?    // JSONB avec tous les champs logistique

  // Relation Auth.js
  user          User?
}
```

### 4.2 Le champ `logistics` (JSONB)

```json
{
  "arrivalMethod": "train",
  "arrivalDate": "2026-07-19",
  "arrivalTime": "14:30",
  "arrivalLocation": "Gare de Grenoble",
  "needsPickup": true,
  "departureDate": "2026-07-26",
  "bikeSpaces": 0,
  "passengerSpaces": 0,
  "comment": "J'arrive avec Roro, on a prévu un Blablacar"
}
```

---

## 5. Admin — Nouvelles fonctionnalités

### 5.1 Lier un User Auth.js à un Rider

Quand quelqu'un se connecte pour la première fois (Google ou email), un `User` est créé avec `role = "pending"`. L'admin doit :
1. Voir la liste des Users en attente (pending)
2. Lier chaque User à un Rider existant (dropdown de sélection)
3. Le User passe en `role = "rider"`

Alternative (plus fluide) : l'admin peut **pré-remplir l'email** d'un Rider. Quand quelqu'un se connecte avec cet email, le lien est fait automatiquement.

### 5.2 Dashboard admin logistique

Nouvelle page admin qui agrège les infos logistique de tous les coureurs :
- Tableau : qui arrive quand, où, comment
- Filtre par date d'arrivée
- Liste des gens qui ont besoin d'être récupérés
- Récapitulatif des places voiture disponibles

### 5.3 Dashboard admin données sportives

Page admin pour voir les poids et FTP de tout le monde :
- Tableau avec poids, FTP, W/kg calculé
- Export possible (pour ton Google Sheet d'équilibrage)
- Indicateur de qui a rempli ses données vs qui ne l'a pas encore fait

---

## 6. Suppression de l'ancien système JWT coureur

### Ce qui est supprimé :
- `src/lib/auth/jwt.ts` (fonctions signJWT / verifyJWT)
- `src/app/api/admin/generate-rider-token/route.ts`
- `src/app/coureur/[token]/` (toutes les pages)
- Le champ `token` sur le model `Rider`

### Ce qui le remplace :
- Auth.js avec Google + Email providers
- `src/app/connexion/page.tsx` (page de login coureur)
- `src/app/mon-espace/` (toutes les pages du portail)
- La session Auth.js identifie le coureur via `session.user.riderId`

### Redirection :
- Les anciens liens `/coureur/[token]` → rediriger vers `/connexion` avec un message explicatif

---

## 7. Tickets de migration

### [PIV.01] Ajouter les tables Auth.js au schéma Prisma
Ajouter les models User, Account, Session, VerificationToken. Ajouter les champs weightKg, ftpWatts, level, logistics sur Rider. Migration Prisma.

### [PIV.02] Reconfigurer Auth.js avec Google + Email
Installer @auth/prisma-adapter. Ajouter GoogleProvider et EmailProvider. Configurer les callbacks (signIn, session) pour gérer les rôles. Configurer un service SMTP (Resend recommandé — gratuit, 100 emails/jour).

### [PIV.03] Page de connexion coureur
Créer `/connexion` avec les boutons Google et Email. Design TDF 2026.

### [PIV.04] Dashboard coureur — Mon espace
Créer `/mon-espace` avec la barre de progression et les liens. Protéger avec middleware Auth.js.

### [PIV.05] Page "Mes infos" — Profil et fun facts
Formulaire éditable : infos de base + infos sportives + 11 fun facts. Sauvegarde dans Rider via Prisma.

### [PIV.06] Page "Mes étapes" — Participation
Liste des 6 étapes avec toggle de participation. Crée/supprime des StageEntry.

### [PIV.07] Page "Logistique"
Formulaire transport/logistique. Sauvegarde dans Rider.logistics (JSONB).

### [PIV.08] Mode course — Migration auth
Migrer `/coureur/[token]/live` vers `/mon-espace/course`. Remplacer l'auth JWT par la session Auth.js. L'API `/api/gps/batch` accepte maintenant un session token Auth.js en plus du JWT (période de transition).

### [PIV.09] Admin — Liaison User ↔ Rider
Page admin pour lier les Users pending à des Riders. Option de pré-remplir les emails sur les Riders pour le lien automatique.

### [PIV.10] Admin — Dashboard logistique
Page admin avec le tableau récapitulatif des arrivées/départs et besoins de transport.

### [PIV.11] Admin — Dashboard données sportives
Page admin avec poids/FTP/W/kg de tous les coureurs. Indicateur de complétion.

### [PIV.12] Nettoyage — Supprimer l'ancien système JWT
Supprimer les fichiers JWT, les anciennes routes `/coureur/[token]`, le champ token sur Rider. Mettre une redirection des anciens liens vers `/connexion`.

---

## 8. Variables d'environnement à ajouter

```env
# Google OAuth
GOOGLE_CLIENT_ID=                  # Depuis console.cloud.google.com
GOOGLE_CLIENT_SECRET=              # Depuis console.cloud.google.com

# Email magic link (Resend recommandé)
EMAIL_SERVER=smtp://resend:re_xxxx@smtp.resend.com:465
EMAIL_FROM=TDF 2026 <noreply@tdf2026.fr>
```

### Comment obtenir les credentials Google OAuth :
1. Va sur https://console.cloud.google.com
2. Crée un projet (ou utilise un existant)
3. Va dans **APIs & Services** → **Credentials**
4. Clique **Create Credentials** → **OAuth client ID**
5. Type : **Web application**
6. Authorized redirect URIs : `http://localhost:3000/api/auth/callback/google` (dev) + `https://ton-url-railway/api/auth/callback/google` (prod)
7. Copie le Client ID et Client Secret

### Comment configurer Resend (emails magic link) :
1. Va sur https://resend.com
2. Crée un compte gratuit (100 emails/jour)
3. Ajoute et vérifie ton domaine (ou utilise l'adresse de test)
4. Copie ta clé API → c'est le `re_xxxx` dans EMAIL_SERVER
