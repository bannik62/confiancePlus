-- CreateEnum
CREATE TYPE "AppointmentCompletionOutcome" AS ENUM ('COMPLETED', 'NOT_DONE');

-- AlterTable
ALTER TABLE "AppointmentCompletion" ADD COLUMN "outcome" "AppointmentCompletionOutcome" NOT NULL DEFAULT 'COMPLETED';
ALTER TABLE "AppointmentCompletion" ADD COLUMN "declineReason" VARCHAR(500);

CREATE INDEX "AppointmentCompletion_outcome_idx" ON "AppointmentCompletion"("outcome");
