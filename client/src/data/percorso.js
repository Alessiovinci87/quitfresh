// ─────────────────────────────────────────────────────────────────────────
// PERCORSO — mappa mentale dei 7 giorni (v3 stabile)
//
// Struttura narrativa validata. Campi:
//   - illusione / nuovaPercezione / osservazione / statoFinale = la MAPPA
//     (regia interna, non necessariamente mostrata all'utente)
//   - body = il COPY definitivo mostrato all'utente (micro, 3-5 frasi)
//
// Stato copy: G3-G7 scritti e fissati. G1-G2 ancora senza `body` (mappa ok,
// copy da rifinire) → la pagina mostra i campi strutturali come fallback.
//
// Scelta architetturale (regola "no nuova complessità"): contenuto STATICO,
// currentDay DERIVATO da user.quitDate. Nessun DB, migration o endpoint.
// ─────────────────────────────────────────────────────────────────────────

export const TOTAL_DAYS = 7;

export const CHAPTERS = [
  {
    day: 1,
    illusione: 'Scelgo io ogni sigaretta.',
    nuovaPercezione: 'Il corpo spesso accende prima che la mente decida: il gesto parte da solo.',
    osservazione: 'Cogliere l’istante in cui la mano si muove prima di qualsiasi pensiero.',
    statoFinale: 'Osservazione inquieta. Prima crepa nell’idea di avere il controllo dell’atto.',
    body: null, // copy da scrivere
  },
  {
    day: 2,
    illusione: 'Mi viene voglia di fumare casualmente.',
    nuovaPercezione: 'Il cervello collega sequenze e rituali.',
    osservazione: 'Vedere i trigger automatici: caffè, pausa, auto, dopo cena.',
    statoFinale: 'Sensazione che molti craving siano appresi, non spontanei.',
    body: null, // copy da scrivere
  },
  {
    day: 3,
    illusione: 'Fumo perché lo voglio.',
    nuovaPercezione: 'Il "lo voglio" è il racconto che la mente costruisce per dare senso a un gesto già innescato, non la causa che lo ha deciso.',
    osservazione: 'Notare quanto in fretta arriva il "lo voglio" e quanto suona ovvio, come se fosse sempre stato lì.',
    statoFinale: 'Il proprio "volere" inizia a sembrare una spiegazione, non un’origine.',
    body: [
      'Pensi: fumo perché lo voglio.',
      'Ma guarda l’ordine delle cose. Quel "lo voglio" arriva in un lampo, già pronto, troppo in fretta per essere una scelta.',
      'Non è da lì che parte. È la spiegazione che la mente incolla sopra qualcosa già iniziato.',
      'Oggi, quando senti "lo voglio", chiediti solo: è arrivato prima o dopo?',
    ],
  },
  {
    day: 4,
    illusione: 'La sigaretta mi rilassa.',
    nuovaPercezione: 'Molte sigarette cercano un’interruzione, una pausa, un cambio di stato, non nicotina. E la paura non è perdere il fumo: è restare senza la pausa.',
    osservazione: 'Notare quando il bisogno arriva nei momenti di sovraccarico o saturazione.',
    statoFinale: 'Confusione iniziale tra bisogno di pausa e bisogno di fumare.',
    body: [
      'La sigaretta ti rilassa, dici.',
      'Ma nota quando la cerchi: quasi mai nella calma, quasi sempre nel troppo.',
      'Non chiami la nicotina, chiami una pausa, un’interruzione, un confine. E sotto, la paura non è restare senza fumo: è restare senza quella pausa.',
      'Oggi guarda cosa stavi facendo nell’istante prima del bisogno.',
    ],
  },
  {
    day: 5,
    illusione: 'Mi manca davvero fumare.',
    nuovaPercezione: 'Alcune sigarette sembrano nostalgia perché legate a identità e rituali, non al piacere. E il vuoto che lasciano è meno permanente di quanto sembri.',
    osservazione: 'Notare quando manca più il gesto che la nicotina, e i momenti in cui il craving passa da solo, anche senza riempirlo.',
    statoFinale: 'La sigaretta come memoria automatica, non piacere puro. Prima sensazione che il vuoto del gesto passa anche se non lo riempio.',
    body: [
      'A volte non manca la sigaretta. Manca il gesto. L’ora. Il posto dove arrivava sempre.',
      'È memoria, non piacere — un rituale che cerca ancora il suo posto.',
      'E quando il vuoto arriva e non lo riempi, guarda bene: passa lo stesso.',
      'Più in fretta di quanto la nostalgia ti aveva promesso.',
    ],
  },
  {
    day: 6,
    illusione: 'Una sola non cambia nulla.',
    nuovaPercezione: 'Il cervello usa la sensazione di controllo per riaprire il ciclo.',
    osservazione: 'Notare quanto "solo una" sembri sempre ragionevole, e cosa succede quando lo si vede arrivare invece di seguirlo.',
    statoFinale: 'Diffidenza verso le razionalizzazioni improvvise. Primo assaggio: vedere la scusa nell’istante in cui arriva le toglie un po’ di presa.',
    body: [
      '"Solo una" sembra sempre ragionevole. È costruita per sembrarlo: è così che il cervello riapre la porta, usando la tua sensazione di controllo contro di te.',
      'Oggi non discutere con il pensiero. Guardalo arrivare.',
      'Nel momento in cui lo vedi per quello che è, perde un po’ di presa.',
    ],
  },
  {
    day: 7,
    illusione: 'Smettere significa resistere per sempre.',
    nuovaPercezione: 'Non è una battaglia eterna di volontà: gli automatismi che hai osservato stanno già svanendo da soli.',
    osservazione: 'Notare i momenti in cui il craving non arriva dove prima arrivava sempre.',
    statoFinale: 'Primo spostamento identitario silenzioso. Non euforia, non vittoria: solo "qualcosa sta cambiando", e non è una sorpresa, è una conferma.',
    body: [
      'Hai immaginato lo smettere come una resistenza infinita.',
      'Ma la resistenza serve contro qualcosa di vivo — e alcuni di questi automatismi li hai già visti spegnersi.',
      'Nota i posti dove il craving non si è presentato, quelli dove prima arrivava sempre.',
      'Non è euforia, non è una vittoria.',
      'È solo qualcosa che sta cambiando.',
    ],
  },
];

// Giorno corrente derivato da quitDate. Giorno 1 = giorno dello smettere.
// Ritorna 1..TOTAL_DAYS (cappato). Se quitDate manca → 1.
export function getCurrentDay(quitDate, now = new Date()) {
  if (!quitDate) return 1;
  const start = new Date(quitDate);
  if (Number.isNaN(start.getTime())) return 1;
  const days = Math.floor((now - start) / 86_400_000);
  return Math.max(1, Math.min(TOTAL_DAYS, days + 1));
}

export function getChapter(day) {
  return CHAPTERS.find((c) => c.day === day) || null;
}
