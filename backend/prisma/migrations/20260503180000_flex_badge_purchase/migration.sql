-- CreateTable
CREATE TABLE "FlexBadgePurchase" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "pricePaidCristaux" INTEGER NOT NULL,
    "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FlexBadgePurchase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FlexBadgePurchase_userId_sku_key" ON "FlexBadgePurchase"("userId", "sku");

-- CreateIndex
CREATE INDEX "FlexBadgePurchase_userId_idx" ON "FlexBadgePurchase"("userId");

-- AddForeignKey
ALTER TABLE "FlexBadgePurchase" ADD CONSTRAINT "FlexBadgePurchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
