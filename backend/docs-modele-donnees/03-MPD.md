# MPD — Modèle Physique de Données

**Rôle :** **implémentation** concrète : types SQL, contraintes, index, énumérations.  
**Indépendance :** **dépend du SGBD** — ici **PostgreSQL 16** via **Prisma ORM**.

---

## SGBD & accès

| Élément | Valeur |
|---------|--------|
| SGBD | PostgreSQL 16 |
| Schéma SQL | `public` (défaut Prisma) |
| ORM | Prisma 5 (`schema.prisma`) |

---

## Types & énumérations PostgreSQL

Les enums Prisma deviennent des types PostgreSQL nommés :

| Type PG | Valeurs |
|---------|---------|
| `GroupType` | `FRIENDS`, `ASSOCIATION` |
| `GroupRole` | `OWNER`, `MEMBER` |
| `HabitOrigin` | `DEFAULT`, `USER` |

Chaînes : `TEXT` (Prisma `String`).  
Booléens : `BOOLEAN`.  
Entiers : `INTEGER` pour `xp`, `order`, `mood`, `sleepQuality`.  
Dates-heures : `TIMESTAMP(3)` pour `DateTime` ; champs `@db.Date` → type **`DATE`**.

---

## Tables physiques (résumé)

| Table | PK | Remarques physiques |
|-------|-----|----------------------|
| `User` | `id` TEXT | `email`, `username`, `activationCode` UNIQUE ; `passwordHash` nullable |
| `Group` | `id` TEXT | `inviteCode` UNIQUE |
| `GroupMember` | `(userId, groupId)` | FK CASCADE vers `User`, `Group` |
| `Habit` | `id` TEXT | FK `userId` → `User` ; colonne `origin` enum |
| `HabitLog` | `id` TEXT | UNIQUE `(habitId, date)` ; FK vers `Habit`, `User` |
| `DailyLog` | `id` TEXT | UNIQUE `(userId, date)` ; FK vers `User` |

Les identifiants `@default(cuid())` sont des **chaînes** côté PostgreSQL.

---

## Index & contraintes implicites

- **UNIQUE** : `User.email`, `User.username`, `User.activationCode`, `Group.inviteCode`, `HabitLog(habitId, date)`, `DailyLog(userId, date)`.
- **FK + ON DELETE CASCADE** : toutes les relations Prisma `onDelete: Cascade` sur `GroupMember`, `Habit`, `HabitLog`, `DailyLog`.

*(Pas d’index secondaires explicites dans le schéma Prisma actuel — le moteur utilise les index PK/UNIQUE.)*

---

## Fichiers sources dans le repo

| Fichier | Rôle |
|---------|------|
| `prisma/schema.prisma` | Source de vérité Prisma → migrations SQL |
| `prisma/migrations/*/migration.sql` | MPD versionné (historique DDL) |

Pour régénérer le SQL « à plat » depuis Prisma :  
`npx prisma migrate diff` (selon besoin) ou consulter les migrations appliquées.
