-- Suivi streak affiché au profil (bannière une fois par jour civil local)
ALTER TABLE "User" ADD COLUMN "lastProfileStreakInt" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "lastStreakBannerYmd" VARCHAR(10);
