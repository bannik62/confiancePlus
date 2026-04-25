# Modélisation des données — Habitracks (habit-tracker)

Ce dossier regroupe les **trois niveaux Merise** appliqués au domaine métier de l’application.

## Les niveaux de modélisation des données

| Niveau | Nom | Rôle | Indépendance |
|--------|-----|------|--------------|
| **MCD** | Modèle Conceptuel de Données | Représentation métier (entités, relations) | Indépendant du SGBD |
| **MLD** | Modèle Logique de Données | Traduction en tables relationnelles | Indépendant du SGBD mais proche |
| **MPD** | Modèle Physique de Données | Implémentation technique (types SQL, index) | Dépendant du SGBD |

## Fichiers

| Fichier | Contenu |
|---------|---------|
| [**api.drawio**](./api.drawio) | **Vue d’ensemble** vues Svelte ↔ préfixes `/api/*` (routes principales, non exhaustif) |
| [**modele-donnees.drawio**](./modele-donnees.drawio) | **Diagrammes Draw.io** — 3 onglets en bas : **MCD**, **MLD**, **MPD** (schéma visuel éditable) |
| [01-MCD.md](./01-MCD.md) | Texte + Mermaid (optionnel) |
| [02-MLD.md](./02-MLD.md) | Tables, clés, schéma relationnel |
| [03-MPD.md](./03-MPD.md) | PostgreSQL + Prisma (types, contraintes, index) |

### Ouvrir le `.drawio`

- **diagrams.net** : *Fichier → Ouvrir depuis…* → choisir `modele-donnees.drawio`.
- **VS Code / Cursor** : extension **« Draw.io Integration »** puis ouvrir le fichier dans l’éditeur.

Tu peux déplacer les blocs, ajouter des cardinalités ou des couleurs : le fichier est un gabarit de départ aligné sur `prisma/schema.prisma`.

---

## État documentaire — **15 avril 2026, 12h47**

### Déjà en place (lié à ce dossier / au MPD)

- Documentation **MCD / MLD / MPD** (fichiers `.md`) + **diagrammes Draw.io** (`modele-donnees.drawio`, 3 onglets).
- **MPD** : migration **`20260414120000_add_habit_origin`** (enum + colonne `origin` sur `Habit`).
- **MPD** : migration **`20260415120000_add_query_indexes`** — index sur `Habit.userId`, `HabitLog.userId`, `DailyLog.userId`, `GroupMember.groupId` (voir [03-MPD.md](./03-MPD.md)).
- Schéma Prisma aligné (`@@index`, `HabitOrigin`, etc.).

### Pistes restantes (hors doc ou à décider plus tard)

| Sujet | Détail |
|--------|--------|
| **Cohérence `HabitLog`** | Garantir que `userId` = propriétaire de l’`habitId` (trigger SQL ou règle applicative stricte + tests). |
| **Index `DailyLog(userId)`** | Un peu redondant avec l’index unique `(userId, date)` ; à retirer un jour si on veut limiter l’écriture disque. |
| **Audit `HabitLog`** | Ajouter `createdAt` (et éventuellement `updatedAt`) si besoin de traçabilité fine. |
| **Rôles applicatifs** | Admin global, fermeture inscriptions par `.env`, etc. — **non** dans ce dossier ; évolution produit / schéma `User` si tu les implémentes. |
| **MCD / Draw.io** | Enrichir cardinalités, note explicative « profils = `GroupMember` + `Group.type` + règles app » (pas d’enum `userSeul` en base). |

*Dernière mise à jour du bloc ci-dessus : **15 avril 2026, 12h47**.*
