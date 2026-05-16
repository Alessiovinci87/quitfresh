-- Idempotente: il batch security precedente potrebbe aver applicato
-- questa colonna prima del rollback. ADD COLUMN IF NOT EXISTS previene
-- crash "column already exists" su Railway prisma migrate deploy.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "tokenVersion" INTEGER NOT NULL DEFAULT 0;
