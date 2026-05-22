-- Aggiunge lastActiveAt per analytics di retention.
ALTER TABLE "User" ADD COLUMN "lastActiveAt" TIMESTAMP(3);
