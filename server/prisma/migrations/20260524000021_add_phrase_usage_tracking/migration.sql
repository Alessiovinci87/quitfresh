-- Tracking anti-ripescaggio frasi libreria cognitiva (sostituisce store in-memory).
-- Retention 35gg via cron giornaliero; finestra di esclusione 30gg.
CREATE TABLE "CognitivePhraseUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "phraseId" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "context" TEXT,

    CONSTRAINT "CognitivePhraseUsage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CognitivePhraseUsage_userId_phraseId_idx" ON "CognitivePhraseUsage"("userId", "phraseId");
CREATE INDEX "CognitivePhraseUsage_userId_usedAt_idx" ON "CognitivePhraseUsage"("userId", "usedAt");

ALTER TABLE "CognitivePhraseUsage" ADD CONSTRAINT "CognitivePhraseUsage_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
