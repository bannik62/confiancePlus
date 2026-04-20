-- Première connexion par jour civil (streak flamme)
CREATE TABLE "DailyVisit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ymd" VARCHAR(10) NOT NULL,

    CONSTRAINT "DailyVisit_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DailyVisit_userId_ymd_key" ON "DailyVisit"("userId", "ymd");
CREATE INDEX "DailyVisit_userId_ymd_idx" ON "DailyVisit"("userId", "ymd");

ALTER TABLE "DailyVisit" ADD CONSTRAINT "DailyVisit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
