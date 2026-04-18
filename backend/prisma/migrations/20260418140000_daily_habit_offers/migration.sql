-- CreateEnum
CREATE TYPE "DailyOfferStatus" AS ENUM ('PENDING', 'DISMISSED', 'ACCEPTED');

-- AlterEnum
ALTER TYPE "HabitOrigin" ADD VALUE 'DAILY_OFFER';

-- CreateTable
CREATE TABLE "DailyHabitTemplate" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "xpTotal" INTEGER NOT NULL DEFAULT 15,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyHabitTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyHabitOffer" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "offerDate" DATE NOT NULL,
    "templateId" TEXT NOT NULL,
    "status" "DailyOfferStatus" NOT NULL DEFAULT 'PENDING',
    "habitId" TEXT,

    CONSTRAINT "DailyHabitOffer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DailyHabitOffer_habitId_key" ON "DailyHabitOffer"("habitId");

-- CreateIndex
CREATE INDEX "DailyHabitOffer_userId_offerDate_idx" ON "DailyHabitOffer"("userId", "offerDate");

-- CreateIndex
CREATE INDEX "DailyHabitOffer_templateId_idx" ON "DailyHabitOffer"("templateId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyHabitOffer_userId_offerDate_key" ON "DailyHabitOffer"("userId", "offerDate");

-- AddForeignKey
ALTER TABLE "DailyHabitOffer" ADD CONSTRAINT "DailyHabitOffer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyHabitOffer" ADD CONSTRAINT "DailyHabitOffer_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "DailyHabitTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyHabitOffer" ADD CONSTRAINT "DailyHabitOffer_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "Habit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
