// ─────────────────────────────────────────────────────────────────────────
// triggerNotify — UNA push al giorno per utente, 45 min prima della fascia di
// craving dichiarata. Il "momento di oggi" del percorso (client) vive 28 giorni;
// questa notifica accompagna quella finestra.
//
// NB: l'onboarding salva `criticalMoments` come etichette di CONTESTO libere
// (Caffè, Stress…), non come fascia oraria. Qui le mappiamo a una delle 4
// fasce e da lì all'orario d'invio. `User.triggerBand` cachea la fascia scelta
// (derivata al salvataggio quiz, override futuro possibile).
//
// Regole assolute rispettate dal chiamante (cron):
//   - una sola notifica/giorno (match esatto al minuto, come l'incoraggiamento)
//   - nessun reminder se non apre (si invia e basta)
//   - nessuna notifica di streak/badge
// ─────────────────────────────────────────────────────────────────────────

// Quanti giorni dura il "momento di oggi" del percorso (client TOTAL_DAYS).
const PERCORSO_DAYS = 28;

// Fascia → orario d'invio (Europe/Rome, HH:MM). Già "45 min prima" del craving.
const BAND_SEND_TIME = {
  mattino: '07:15',
  primo_pomeriggio: '12:15',
  pomeriggio: '15:00',
  sera: '19:30',
};

// Ordine di priorità delle fasce per il tie-break (la più mattutina vince, così
// la nudge arriva il prima possibile nella giornata dichiarata).
const BAND_PRIORITY = ['mattino', 'primo_pomeriggio', 'pomeriggio', 'sera'];

// Etichetta `criticalMoments` (onboarding) → fascia. Le custom/ignote sono
// scartate; se nessuna mappa, fallback in deriveTriggerBand().
const LABEL_TO_BAND = {
  'Mattino al risveglio': 'mattino',
  'Caffè': 'mattino',
  'Guida': 'mattino',
  'Pausa lavoro': 'primo_pomeriggio',
  'Telefonate': 'primo_pomeriggio',
  'Stress': 'pomeriggio',
  'Noia': 'pomeriggio',
  'Dopo i pasti': 'sera',
  'Alcol': 'sera',
  'Socialità': 'sera',
};

const FALLBACK_BAND = 'mattino';

// Lista rotante: un testo per giorno, ciclica. NON è un'anteprima del
// contenuto: è un micro-pensiero autonomo.
const MOMENT_MESSAGES = [
  'C’è un momento che ti aspetta. Non è urgente.',
  'Il craving non è un comando. È solo rumore familiare.',
  'Oggi c’è qualcosa da osservare.',
  'Tra poco potresti accenderne una. O no.',
  'Una cosa sola, oggi.',
  'Non devi fare niente. Solo guardare.',
  'Il meccanismo sta girando. Lo vedi?',
];

// Deriva la fascia da un array di etichette criticalMoments.
// Conta le fasce note, prende la più frequente; a parità, la più mattutina.
// Se nessuna etichetta è mappabile → FALLBACK_BAND.
function deriveTriggerBand(criticalMoments) {
  if (!Array.isArray(criticalMoments) || criticalMoments.length === 0) {
    return FALLBACK_BAND;
  }
  const counts = {};
  for (const label of criticalMoments) {
    const band = LABEL_TO_BAND[label];
    if (band) counts[band] = (counts[band] || 0) + 1;
  }
  const bands = Object.keys(counts);
  if (bands.length === 0) return FALLBACK_BAND;
  bands.sort((a, b) => {
    if (counts[b] !== counts[a]) return counts[b] - counts[a]; // più frequente
    return BAND_PRIORITY.indexOf(a) - BAND_PRIORITY.indexOf(b); // poi più presto
  });
  return bands[0];
}

// Fascia il cui orario d'invio coincide col minuto corrente (o null).
function bandForSendTime(timeStr) {
  return BAND_PRIORITY.find((band) => BAND_SEND_TIME[band] === timeStr) || null;
}

// Indice del giorno nel percorso (0-based) da quitDate, in Europe/Rome.
// < 0 prima dello smettere, >= PERCORSO_DAYS oltre la finestra.
function percorsoDayIndex(quitDate, romeNow) {
  const start = new Date(new Date(quitDate).toLocaleString('en-US', { timeZone: 'Europe/Rome' }));
  return Math.floor((romeNow - start) / 86400000);
}

// True se l'utente è dentro la finestra del percorso (giorni 1..PERCORSO_DAYS).
function isInPercorsoWindow(quitDate, romeNow) {
  const i = percorsoDayIndex(quitDate, romeNow);
  return i >= 0 && i < PERCORSO_DAYS;
}

// Messaggio del giorno: rotazione ciclica sui giorni del percorso.
function momentMessageForDay(dayIndex) {
  const i = ((dayIndex % MOMENT_MESSAGES.length) + MOMENT_MESSAGES.length) % MOMENT_MESSAGES.length;
  return MOMENT_MESSAGES[i];
}

module.exports = {
  PERCORSO_DAYS,
  BAND_SEND_TIME,
  MOMENT_MESSAGES,
  deriveTriggerBand,
  bandForSendTime,
  percorsoDayIndex,
  isInPercorsoWindow,
  momentMessageForDay,
};
