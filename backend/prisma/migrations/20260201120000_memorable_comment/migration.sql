-- Commentaires sur les moments mémorables (leaderboard)

CREATE TABLE "MemorableComment" (
    "id" TEXT NOT NULL,
    "dailyLogId" TEXT NOT NULL,
    "authorUserId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemorableComment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MemorableComment_dailyLogId_createdAt_idx"
ON "MemorableComment"("dailyLogId", "createdAt");

CREATE INDEX "MemorableComment_authorUserId_createdAt_idx"
ON "MemorableComment"("authorUserId", "createdAt");

ALTER TABLE "MemorableComment" ADD CONSTRAINT "MemorableComment_dailyLogId_fkey"
FOREIGN KEY ("dailyLogId") REFERENCES "DailyLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MemorableComment" ADD CONSTRAINT "MemorableComment_authorUserId_fkey"
FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
