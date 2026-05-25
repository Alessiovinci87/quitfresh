-- Welcome flow post-onboarding (activation): micro-esperienza mostrata una
-- sola volta ai nuovi utenti subito dopo l'onboarding, prima della home.
-- welcomeFlowCompleted: i nuovi utenti partono a false e vedono il flow una
-- volta; gli utenti gia' esistenti vengono backfillati a true cosi' NON lo
-- vedono mai (grandfathering, stesso principio di freemiumGrandfathered).

ALTER TABLE "User" ADD COLUMN "welcomeFlowCompleted" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: tutti gli utenti gia' registrati prima del deploy non vedono il flow.
UPDATE "User" SET "welcomeFlowCompleted" = true;
