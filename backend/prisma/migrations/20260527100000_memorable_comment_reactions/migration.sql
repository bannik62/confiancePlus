-- Réactions-type Facebook sur les commentaires « moment mémorable »

CREATE TYPE "MemorableCommentReactionKind" AS ENUM ('LIKE', 'LOVE', 'HAHA', 'WOW', 'SAD', 'ANGRY');

CREATE TABLE "MemorableCommentReaction" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "MemorableCommentReactionKind" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemorableCommentReaction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MemorableCommentReaction_commentId_userId_key" ON "MemorableCommentReaction"("commentId", "userId");

CREATE INDEX "MemorableCommentReaction_commentId_idx" ON "MemorableCommentReaction"("commentId");

ALTER TABLE "MemorableCommentReaction" ADD CONSTRAINT "MemorableCommentReaction_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "MemorableComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MemorableCommentReaction" ADD CONSTRAINT "MemorableCommentReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
