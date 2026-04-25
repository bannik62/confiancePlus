-- Renommage : suivi générique du dernier palier série réclamé (plus « floor 7 » figé)
ALTER TABLE "User" RENAME COLUMN "streak7RewardClaimFloor" TO "streakMilestoneMaxClaimedAt";
