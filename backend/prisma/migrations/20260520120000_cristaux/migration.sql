-- Cristaux (monnaie virtuelle) + suivi anti-doublon

ALTER TABLE "User" ADD COLUMN "cristaux" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "lastCristalConnexionYmd" TEXT;
ALTER TABLE "User" ADD COLUMN "lastCristalJourneeParfaiteYmd" TEXT;

ALTER TABLE "DailyHabitOffer" ADD COLUMN "cristauxGranted" BOOLEAN NOT NULL DEFAULT false;
