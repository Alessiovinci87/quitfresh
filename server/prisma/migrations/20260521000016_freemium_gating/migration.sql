-- Aggiunge campi per il gating freemium contestuale.
-- chatMessagesUsed: contatore messaggi chat AI consumati nel piano free.
-- freemiumGrandfathered: tutti gli utenti registrati PRIMA del deploy
-- vengono marcati true e mantengono accesso illimitato (non puniamo
-- chi ha gia' usato il prodotto). I nuovi utenti default false.

ALTER TABLE "User" ADD COLUMN "chatMessagesUsed" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "freemiumGrandfathered" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: grandfather tutti gli utenti gia' esistenti.
UPDATE "User" SET "freemiumGrandfathered" = true;
