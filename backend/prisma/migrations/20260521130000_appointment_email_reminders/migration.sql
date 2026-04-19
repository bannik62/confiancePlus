-- Rappels RDV par e-mail (veille + 1 h avant) — anti-doublon

ALTER TABLE "Appointment" ADD COLUMN "emailReminderDayBeforeSentAt" TIMESTAMP(3);
ALTER TABLE "Appointment" ADD COLUMN "emailReminderHourBeforeSentAt" TIMESTAMP(3);
