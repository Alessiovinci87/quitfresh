-- Chat free: passa da limite lifetime a 10 messaggi per settimana ricorrente.
-- chatWeekStart traccia l'inizio della settimana corrente del contatore.
-- null = nessun messaggio mai inviato (verra' settato al primo invio).

ALTER TABLE "User" ADD COLUMN "chatWeekStart" TIMESTAMP(3);
