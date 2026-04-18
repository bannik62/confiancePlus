-- Heure du RDV + XP fixe à 30 par défaut
ALTER TABLE "Appointment" ADD COLUMN "timeHm" VARCHAR(5) NOT NULL DEFAULT '09:00';

UPDATE "Appointment" SET "xpReward" = 30;

ALTER TABLE "Appointment" ALTER COLUMN "xpReward" SET DEFAULT 30;
