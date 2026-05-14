-- AlterTable
ALTER TABLE "PromoCode" ADD COLUMN "maxUses" INTEGER;
ALTER TABLE "PromoCode" ADD COLUMN "expiresAt" TIMESTAMP(3);
ALTER TABLE "PromoCode" ADD COLUMN "notes" TEXT;
