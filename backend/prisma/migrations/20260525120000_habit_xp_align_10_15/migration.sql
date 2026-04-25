-- Aligne le défaut Prisma et les données avec l’économie cible : habitudes perso 10, offre du jour 15 (si encore à l’ancien 20).

-- AlterTable
ALTER TABLE "Habit" ALTER COLUMN "xp" SET DEFAULT 10;

-- Anciennes lignes (défaut schéma 20 ou packs seed 15–25) → 10 pour USER / DEFAULT
UPDATE "Habit" SET "xp" = 10 WHERE "origin" IN ('USER', 'DEFAULT') AND "xp" <> 10;

-- Offres du jour encore à 20 → 15 (template cible admin)
UPDATE "Habit" SET "xp" = 15 WHERE "origin" = 'DAILY_OFFER' AND "xp" = 20;
