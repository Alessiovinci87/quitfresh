-- AlterTable
ALTER TABLE "User" ADD COLUMN "isAdmin" BOOLEAN NOT NULL DEFAULT false;

-- Promuovi l'account admin (no-op se l'utente non si è ancora registrato).
-- Se ti registri dopo questa migration, esegui manualmente:
--   UPDATE "User" SET "isAdmin" = true WHERE email = 'alessio.vinci@gmail.com';
UPDATE "User" SET "isAdmin" = true WHERE email = 'alessio.vinci@gmail.com';
