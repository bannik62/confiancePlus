-- CreateEnum
CREATE TYPE "HabitPerfReactionKind" AS ENUM ('HEART', 'SKEPTIC');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "perfReactionEmailsEnabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "HabitPerfReaction" (
    "id" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "habitId" TEXT NOT NULL,
    "ymd" VARCHAR(10) NOT NULL,
    "kind" "HabitPerfReactionKind" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HabitPerfReaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HabitPerfReaction_fromUserId_habitId_ymd_key" ON "HabitPerfReaction"("fromUserId", "habitId", "ymd");

-- CreateIndex
CREATE INDEX "HabitPerfReaction_habitId_ymd_idx" ON "HabitPerfReaction"("habitId", "ymd");

-- AddForeignKey
ALTER TABLE "HabitPerfReaction" ADD CONSTRAINT "HabitPerfReaction_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HabitPerfReaction" ADD CONSTRAINT "HabitPerfReaction_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "Habit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
