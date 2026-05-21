-- SOS Craving feature: motivi per smettere, counter craving battuti, sessioni.
-- Idempotente per evitare crash su replay (Railway prisma migrate deploy).

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "quitReasons" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "cravingsBattled" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "CravingSession" (
  "id"              TEXT NOT NULL,
  "userId"          TEXT NOT NULL,
  "intensityBefore" INTEGER NOT NULL,
  "intensityAfter"  INTEGER,
  "type"            TEXT NOT NULL,
  "completedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CravingSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CravingSession_userId_completedAt_idx"
  ON "CravingSession"("userId", "completedAt");

DO $$ BEGIN
  ALTER TABLE "CravingSession"
    ADD CONSTRAINT "CravingSession_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
