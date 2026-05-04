-- CreateTable
CREATE TABLE "MemorableDailyLogReaction" (
    "id" TEXT NOT NULL,
    "dailyLogId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "MemorableCommentReactionKind" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemorableDailyLogReaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MemorableDailyLogReaction_dailyLogId_userId_key" ON "MemorableDailyLogReaction"("dailyLogId", "userId");

-- CreateIndex
CREATE INDEX "MemorableDailyLogReaction_dailyLogId_idx" ON "MemorableDailyLogReaction"("dailyLogId");

-- AddForeignKey
ALTER TABLE "MemorableDailyLogReaction" ADD CONSTRAINT "MemorableDailyLogReaction_dailyLogId_fkey" FOREIGN KEY ("dailyLogId") REFERENCES "DailyLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemorableDailyLogReaction" ADD CONSTRAINT "MemorableDailyLogReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
