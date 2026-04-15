-- À lancer une fois sur ta base (psql, DBeaver, etc.) si tu n’utilises pas `prisma migrate`.
-- Préféré : `cd backend && npx prisma migrate dev --name habit_origin`
-- (avec DATABASE_URL pointant vers la même base que le serveur Node)

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'HabitOrigin') THEN
    CREATE TYPE "HabitOrigin" AS ENUM ('DEFAULT', 'USER');
  END IF;
END $$;

ALTER TABLE "Habit" ADD COLUMN IF NOT EXISTS "origin" "HabitOrigin" NOT NULL DEFAULT 'DEFAULT';
