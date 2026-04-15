# Modélisation des données — Confiance+ (habit-tracker)

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
| [**modele-donnees.drawio**](./modele-donnees.drawio) | **Diagrammes Draw.io** — 3 onglets en bas : **MCD**, **MLD**, **MPD** (schéma visuel éditable) |
| [01-MCD.md](./01-MCD.md) | Texte + Mermaid (optionnel) |
| [02-MLD.md](./02-MLD.md) | Tables, clés, schéma relationnel |
| [03-MPD.md](./03-MPD.md) | PostgreSQL + Prisma (types, contraintes, index) |

### Ouvrir le `.drawio`

- **diagrams.net** : *Fichier → Ouvrir depuis…* → choisir `modele-donnees.drawio`.
- **VS Code / Cursor** : extension **« Draw.io Integration »** puis ouvrir le fichier dans l’éditeur.

Tu peux déplacer les blocs, ajouter des cardinalités ou des couleurs : le fichier est un gabarit de départ aligné sur `prisma/schema.prisma`.
