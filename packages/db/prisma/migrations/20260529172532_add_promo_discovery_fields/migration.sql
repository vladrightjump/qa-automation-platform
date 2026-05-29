-- AlterTable
ALTER TABLE "PromoCode" ADD COLUMN     "description" TEXT,
ADD COLUMN     "featured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "maxRedemptions" INTEGER,
ADD COLUMN     "minSpendCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "timesRedeemed" INTEGER NOT NULL DEFAULT 0;
