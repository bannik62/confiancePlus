-- AlterTable
ALTER TABLE "User" ADD COLUMN "lastDismissedBroadcastId" TEXT;

-- CreateTable
CREATE TABLE "AdminBroadcast" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminBroadcast_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AdminBroadcast_isActive_updatedAt_idx" ON "AdminBroadcast"("isActive", "updatedAt");
