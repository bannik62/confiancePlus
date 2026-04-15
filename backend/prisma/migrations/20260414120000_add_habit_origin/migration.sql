-- CreateEnum
CREATE TYPE "HabitOrigin" AS ENUM ('DEFAULT', 'USER');

-- AlterTable
ALTER TABLE "Habit" ADD COLUMN "origin" "HabitOrigin" NOT NULL DEFAULT 'DEFAULT';
