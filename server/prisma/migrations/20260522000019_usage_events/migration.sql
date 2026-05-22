-- Telemetria di prodotto: tabella eventi + flag opt-out su User.
ALTER TABLE "User" ADD COLUMN "analyticsOptOut" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "UsageEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "type" TEXT NOT NULL,
    "path" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsageEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "UsageEvent_userId_createdAt_idx" ON "UsageEvent"("userId", "createdAt");
CREATE INDEX "UsageEvent_type_createdAt_idx" ON "UsageEvent"("type", "createdAt");
CREATE INDEX "UsageEvent_createdAt_idx" ON "UsageEvent"("createdAt");

ALTER TABLE "UsageEvent" ADD CONSTRAINT "UsageEvent_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
