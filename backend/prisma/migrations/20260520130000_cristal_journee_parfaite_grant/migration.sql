-- Idempotence bonus « journée parfaite » par (user, jour civil) — après colonnes cristaux (20260520120000_cristaux)

CREATE TABLE "CristalJourneeParfaiteGrant" (
    "userId" TEXT NOT NULL,
    "ymd" VARCHAR(10) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CristalJourneeParfaiteGrant_pkey" PRIMARY KEY ("userId","ymd")
);

CREATE INDEX "CristalJourneeParfaiteGrant_userId_idx" ON "CristalJourneeParfaiteGrant"("userId");

ALTER TABLE "CristalJourneeParfaiteGrant" ADD CONSTRAINT "CristalJourneeParfaiteGrant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "CristalJourneeParfaiteGrant" ("userId", "ymd", "createdAt")
SELECT "id", "lastCristalJourneeParfaiteYmd", NOW()
FROM "User"
WHERE "lastCristalJourneeParfaiteYmd" IS NOT NULL;
