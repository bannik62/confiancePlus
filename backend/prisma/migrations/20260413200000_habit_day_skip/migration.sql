-- CreateTable
CREATE TABLE "HabitDaySkip" (
    "id" TEXT NOT NULL,
    "habitId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,

    CONSTRAINT "HabitDaySkip_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HabitDaySkip_habitId_date_key" ON "HabitDaySkip"("habitId", "date");

-- CreateIndex
CREATE INDEX "HabitDaySkip_userId_date_idx" ON "HabitDaySkip"("userId", "date");

-- AddForeignKey
ALTER TABLE "HabitDaySkip" ADD CONSTRAINT "HabitDaySkip_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "Habit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HabitDaySkip" ADD CONSTRAINT "HabitDaySkip_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
