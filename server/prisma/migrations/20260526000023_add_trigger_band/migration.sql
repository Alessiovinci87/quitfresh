-- triggerBand: fascia oraria del craving dichiarato, usata per inviare UNA
-- push/giorno (45 min prima) durante la finestra dei 28 giorni del percorso.
-- L'onboarding salva solo criticalMoments (etichette di contesto); la fascia
-- viene derivata server-side al salvataggio quiz. IF NOT EXISTS per idempotenza
-- (il DB Railway puo' gia' avere la colonna se la migration fu applicata e poi
-- il codice rollbackato — lezione del crash del 15 maggio).
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "triggerBand" TEXT;

-- Backfill utenti esistenti: deriva la fascia dalle criticalMoments con la
-- stessa priorita' del codice JS (a parita', la fascia piu' mattutina vince).
-- Le etichette ignote/custom non contribuiscono; se nessuna mappa → 'mattino'.
UPDATE "User"
SET "triggerBand" = CASE
  WHEN 'Mattino al risveglio' = ANY("criticalMoments")
    OR 'Caffè' = ANY("criticalMoments")
    OR 'Guida' = ANY("criticalMoments") THEN 'mattino'
  WHEN 'Pausa lavoro' = ANY("criticalMoments")
    OR 'Telefonate' = ANY("criticalMoments") THEN 'primo_pomeriggio'
  WHEN 'Stress' = ANY("criticalMoments")
    OR 'Noia' = ANY("criticalMoments") THEN 'pomeriggio'
  WHEN 'Dopo i pasti' = ANY("criticalMoments")
    OR 'Alcol' = ANY("criticalMoments")
    OR 'Socialità' = ANY("criticalMoments") THEN 'sera'
  ELSE 'mattino'
END
WHERE "triggerBand" IS NULL
  AND "criticalMoments" IS NOT NULL
  AND array_length("criticalMoments", 1) > 0;
