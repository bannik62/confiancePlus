-- Trophée palier série 7 jours (Items) + suivi de réclamation par série
ALTER TABLE "User" ADD COLUMN "streak7TrophyCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "streak7RewardClaimFloor" INTEGER NOT NULL DEFAULT 0;
