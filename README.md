<!-- Palette alignée sur frontend/src/styles/theme.css — HabiTracks -->
<p align="center">
  <img alt="HabiTracks" src="https://img.shields.io/badge/HabiTracks-habitudes_%E2%80%A2_groupes_%E2%80%A2_XP-7c3aed?style=for-the-badge&labelColor=07071a&color=7c3aed" />
</p>

<p align="center">
  <img alt="Svelte" src="https://img.shields.io/badge/Svelte-4A4A55?style=flat-square&logo=svelte&logoColor=FF3E00" />
  <img alt="Express" src="https://img.shields.io/badge/Express-0e0e2a?style=flat-square&logo=express&logoColor=f59e0b" />
  <img alt="Prisma" src="https://img.shields.io/badge/Prisma-06b6d4?style=flat-square&logo=prisma&logoColor=white" />
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-1e1b4b?style=flat-square&logo=postgresql&logoColor=e2e8f0" />
  <img alt="Docker" src="https://img.shields.io/badge/Docker-0e0e2a?style=flat-square&logo=docker&logoColor=06b6d4" />
</p>

<p align="center"><strong>Application web (PWA)</strong> — check-in quotidien, habitudes, XP & niveaux, groupes (solo / amis / association).</p>

---

## Aperçu

| Rôle | Couleur | Variable |
|------|---------|----------|
| Fond principal | `#07071a` | `--bg` |
| Surface (cartes) | `#0e0e2a` | `--surface` |
| Surface modale | `#0f0f2a` | `--surface-modal` |
| Overlay (modales) | `#000000cc` | `--overlay` |
| Bordure | `#1e1b4b` | `--border` |
| Texte | `#e2e8f0` | `--text` |
| Texte secondaire | `#64748b` | `--muted` |
| Accent (violet) | `#7c3aed` | `--accent` |
| Or (XP / niveau) | `#f59e0b` | `--gold` |
| Cyan | `#06b6d4` | `--cyan` |
| Vert (succès) | `#10b981` | `--green` |
| Rouge (alerte) | `#ef4444` | `--red` |

**Dégradés & détails** (topbar, barre XP, boutons accent, stats « lever de soleil » à 5 paliers, etc.) : voir **`frontend/src/styles/theme.css`** — une seule source de vérité pour le CSS (`--grad-*`, `--stat-global-*`, `--topbar-*`, …).

---

## Prérequis

- **Docker** & Docker Compose  
- **Node.js** (LTS) pour le front en local hors conteneur

---

## Démarrage rapide

### 1. Variables d’environnement

```bash
cp .env.example .env
```

Adapte au minimum `JWT_SECRET`, `POSTGRES_PASSWORD` et cohérence de `DATABASE_URL` avec la base.

### 2. Dépendances (optionnel si tout passe par Docker pour le back)

```bash
npm run install:all
```

### 3. Base de données & seed

Le conteneur **`backend`** doit tourner pour les scripts `npm run db:*` (`docker compose exec backend …`).

```bash
docker compose up -d db
docker compose up -d backend   # ou : docker compose up -d
npm run db:migrate
npm run db:seed
```

### 4. Lancer l’API (Docker)

```bash
docker compose up backend db
```

API : **http://localhost:3000**

### 5. Lancer le front (Vite)

Dans un second terminal :

```bash
npm run dev:front
```

Front : **http://localhost:5173** (port par défaut Vite ; le proxy pointe vers `/api` → backend).

### Tout monter d’un coup

```bash
npm run dev
```

Lance les services définis dans `docker-compose.yml` (base + backend). Ajoute le front avec `npm run dev:front` si besoin.

---

## Comptes démo (après seed)

| Profil | Email | Mot de passe |
|--------|-------|----------------|
| Solo | `solo@demo.dev` | `demo1234` |
| Éducateur | `educateur@demo.dev` | `demo1234` |
| Membre | `membre@demo.dev` | `demo1234` |

---

## Structure du dépôt

```
habit-tracker/
├── backend/          # Express, Prisma, modules auth / habits / checkin / group / stats
├── frontend/         # Svelte + Vite, PWA (Workbox)
├── docker-compose.yml
├── package.json      # scripts racine (dev, db:*, …)
└── .env.example
```

---

## Scripts utiles (racine)

| Script | Rôle |
|--------|------|
| `npm run dev` | `docker compose up` |
| `npm run dev:front` | Vite (front) |
| `npm run db:seed` | Données de démo Prisma |
| `npm run db:studio` | Prisma Studio |
| `npm run stop` | `docker compose down` |

---

## Sécurité (rappel)

- Auth **JWT en cookie httpOnly** + **CSRF** sur les mutations  
- Rate limiting sur l’API et les routes sensibles  
- Ne commite **jamais** `.env` (déjà ignoré par `.gitignore`)

---

## Licence

Projet privé — précise ici ta licence si tu en publie une sur GitHub.
