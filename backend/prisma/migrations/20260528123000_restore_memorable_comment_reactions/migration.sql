DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MemorableCommentReactionKind') THEN
    CREATE TYPE "MemorableCommentReactionKind" AS ENUM ('LIKE', 'LOVE', 'HAHA', 'WOW', 'SAD', 'ANGRY');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "MemorableCommentReaction" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "MemorableCommentReactionKind" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemorableCommentReaction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MemorableCommentReaction_commentId_userId_key"
ON "MemorableCommentReaction"("commentId", "userId");

CREATE INDEX IF NOT EXISTS "MemorableCommentReaction_commentId_idx"
ON "MemorableCommentReaction"("commentId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'MemorableCommentReaction_commentId_fkey'
  ) THEN
    ALTER TABLE "MemorableCommentReaction" ADD CONSTRAINT "MemorableCommentReaction_commentId_fkey"
    FOREIGN KEY ("commentId") REFERENCES "MemorableComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'MemorableCommentReaction_userId_fkey'
  ) THEN
    ALTER TABLE "MemorableCommentReaction" ADD CONSTRAINT "MemorableCommentReaction_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
