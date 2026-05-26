// ─────────────────────────────────────────────────────────────────────────
// PERCORSO — mappa mentale dei 7 giorni (v3) + scene interattive
//
// Ogni capitolo ha:
//   - headline   : titolo corto, usato dal blocco "Momento di oggi" in Home
//   - scenes[]   : micro-scene mostrate UNA alla volta nel player a tap
//                  type: 'title' | 'thought' | 'break' | 'notice'
//   - cta        : etichetta del bottone sull'ultima scena
//   - body       : copy "lineare" (fallback / riferimento)
//   - illusione / nuovaPercezione / osservazione / statoFinale = la MAPPA
//
// Stato: G1-G7 hanno scene complete. Contenuto STATICO, currentDay DERIVATO
// da quitDate. Nessun DB, migration o endpoint (regola "no nuova complessità").
// ─────────────────────────────────────────────────────────────────────────

import { week2 } from './week2';
import { week3 } from './week3';
import { week4 } from './week4';

export const TOTAL_DAYS = 28;
const CTA_DEFAULT = 'Lo terrò d’occhio oggi';

export const CHAPTERS = [
  {
    day: 1,
    headline: 'Il gesto parte prima del pensiero.',
    interaction: {
      question: 'Quante sigarette oggi potrebbero partire da sole?',
      options: [
        { label: 'Poche', feedback: 'Anche solo notarle cambia il momento. Prima sembrava scelta, ora inizi a vedere il gesto.' },
        { label: 'Alcune', feedback: 'Già notarlo cambia il momento. Prima sembrava scelta, ora inizi a vedere il gesto.' },
        { label: 'Quasi tutte', feedback: 'Sembra tanto. Ma vederle è esattamente ciò che inizia a togliere l’automatismo.' },
      ],
    },
    illusione: 'Scelgo io ogni sigaretta.',
    nuovaPercezione: 'Il corpo spesso accende prima che la mente decida: il gesto parte da solo.',
    osservazione: 'Cogliere l’istante in cui la mano si muove prima di qualsiasi pensiero.',
    statoFinale: 'Osservazione inquieta. Prima crepa nell’idea di avere il controllo dell’atto.',
    cta: CTA_DEFAULT,
    scenes: [
      { type: 'title', text: 'Alcuni craving arrivano prima del pensiero.' },
      { type: 'thought', text: 'A volte hai già la sigaretta in mano prima ancora di aver deciso.' },
      { type: 'break', text: 'Non è debolezza.' },
      { type: 'thought', text: 'Il cervello esegue una sequenza. Solo dopo costruisce la motivazione.' },
      { type: 'notice', text: 'Il momento preciso in cui il gesto parte da solo.' },
    ],
    body: null,
  },
  {
    day: 2,
    headline: 'Il craving non è casuale.',
    interaction: {
      question: 'Quale sequenza senti più forte?',
      options: [
        { label: 'Caffè', feedback: 'Il caffè e la sigaretta sono cresciuti insieme. Separarli è più questione di sequenza che di voglia.' },
        { label: 'Auto', feedback: 'Spesso il craving non arriva in auto. Arriva un secondo dopo aver chiuso la portiera.' },
        { label: 'Pausa', feedback: 'Non è la pausa a chiedere il fumo. È l’abitudine ad averlo riempito.' },
        { label: 'Dopo cena', feedback: 'Dopo cena il corpo aspetta il segnale di sempre. È un orario, più che un desiderio.' },
      ],
    },
    illusione: 'Mi viene voglia di fumare casualmente.',
    nuovaPercezione: 'Il cervello collega sequenze e rituali.',
    osservazione: 'Vedere i trigger automatici: caffè, pausa, auto, dopo cena.',
    statoFinale: 'Sensazione che molti craving siano appresi, non spontanei.',
    cta: CTA_DEFAULT,
    scenes: [
      { type: 'title', text: 'Pensi che la voglia arrivi a caso.' },
      { type: 'thought', text: 'Quasi mai. Arriva col caffè. Con la pausa. In auto. Dopo cena.' },
      { type: 'break', text: 'Sono sequenze.' },
      { type: 'thought', text: 'Il cervello ha imparato ad accendere in certi momenti. Sempre gli stessi.' },
      { type: 'notice', text: 'I momenti in cui la voglia torna puntuale, come un orario.' },
    ],
    body: null,
  },
  {
    day: 3,
    headline: 'Il volere arriva dopo.',
    interaction: {
      question: 'Quando senti "lo voglio", di solito arriva...',
      options: [
        { label: 'Prima del gesto', feedback: 'Forse. Ma prova a guardare ancora: a volte la mano si muove un attimo prima.' },
        { label: 'Insieme al gesto', feedback: 'Quasi sempre è così veloce da sembrare insieme. È lì che la mente copre il gesto.' },
        { label: 'Lo capisco solo dopo', feedback: 'Ecco il punto. Il "voglio" è la spiegazione, non l’origine.' },
      ],
    },
    illusione: 'Fumo perché lo voglio.',
    nuovaPercezione: 'Il "lo voglio" è il racconto che la mente costruisce per dare senso a un gesto già innescato, non la causa che lo ha deciso.',
    osservazione: 'Notare quanto in fretta arriva il "lo voglio" e quanto suona ovvio.',
    statoFinale: 'Il proprio "volere" inizia a sembrare una spiegazione, non un’origine.',
    cta: CTA_DEFAULT,
    scenes: [
      { type: 'title', text: 'Fumo perché lo voglio.' },
      { type: 'thought', text: 'Ma guarda l’ordine delle cose.' },
      { type: 'thought', text: 'Quel “lo voglio” arriva già pronto. Troppo in fretta per essere una scelta.' },
      { type: 'break', text: 'Non è da lì che parte.' },
      { type: 'thought', text: 'È la spiegazione che la mente incolla sopra qualcosa già iniziato.' },
      { type: 'notice', text: 'Quando senti “lo voglio”, chiediti: è arrivato prima o dopo?' },
    ],
    body: [
      'Pensi: fumo perché lo voglio.',
      'Ma guarda l’ordine delle cose. Quel "lo voglio" arriva in un lampo, già pronto, troppo in fretta per essere una scelta.',
      'Non è da lì che parte. È la spiegazione che la mente incolla sopra qualcosa già iniziato.',
      'Oggi, quando senti "lo voglio", chiediti solo: è arrivato prima o dopo?',
    ],
  },
  {
    day: 4,
    headline: 'Non è la nicotina. È la pausa.',
    interaction: {
      question: 'Quando ti manca di più quella pausa?',
      options: [
        { label: 'Stress', feedback: 'Questo è il punto: spesso non manca il fumo. Manca l’interruzione.' },
        { label: 'Dopo lavoro', feedback: 'Non è nicotina. È il confine tra il prima e il dopo.' },
        { label: 'Dopo cena', feedback: 'Spesso non manca il fumo. Manca lo stacco, il "è finita".' },
        { label: 'Quando sono solo', feedback: 'Non è compagnia di fumo. È qualcosa che riempie il silenzio.' },
      ],
    },
    illusione: 'La sigaretta mi rilassa.',
    nuovaPercezione: 'Molte sigarette cercano un’interruzione, una pausa, un cambio di stato, non nicotina.',
    osservazione: 'Notare quando il bisogno arriva nei momenti di sovraccarico o saturazione.',
    statoFinale: 'Confusione iniziale tra bisogno di pausa e bisogno di fumare.',
    cta: CTA_DEFAULT,
    scenes: [
      { type: 'title', text: 'La sigaretta mi rilassa.' },
      { type: 'thought', text: 'Ma nota quando la cerchi: quasi mai nella calma.' },
      { type: 'break', text: 'Quasi sempre nel troppo.' },
      { type: 'thought', text: 'Non chiami la nicotina. Chiami una pausa, un’interruzione, un confine.' },
      { type: 'thought', text: 'E sotto, la paura non è restare senza fumo. È restare senza quella pausa.' },
      { type: 'notice', text: 'Cosa stavi facendo nell’istante prima del bisogno.' },
    ],
    body: [
      'La sigaretta ti rilassa, dici.',
      'Ma nota quando la cerchi: quasi mai nella calma, quasi sempre nel troppo.',
      'Non chiami la nicotina, chiami una pausa, un’interruzione, un confine. E sotto, la paura non è restare senza fumo: è restare senza quella pausa.',
      'Oggi guarda cosa stavi facendo nell’istante prima del bisogno.',
    ],
  },
  {
    day: 5,
    headline: 'È memoria, non piacere.',
    interaction: {
      question: 'Cosa ti manca davvero, quando ti manca?',
      options: [
        { label: 'Il gesto', feedback: 'È memoria del corpo, non bisogno. E la memoria sbiadisce.' },
        { label: 'L’odore, il sapore', feedback: 'È il rituale legato ai sensi, non il piacere puro. Anche questo si slega.' },
        { label: 'Il momento', feedback: 'Ti manca il momento, non la sigaretta. Il momento puoi tenerlo, senza.' },
        { label: 'Non lo so', feedback: 'Va bene non saperlo. Spesso, quando guardi bene, dentro non c’è il fumo.' },
      ],
    },
    illusione: 'Mi manca davvero fumare.',
    nuovaPercezione: 'Alcune sigarette sembrano nostalgia perché legate a identità e rituali, non al piacere.',
    osservazione: 'Notare quando manca più il gesto che la nicotina.',
    statoFinale: 'La sigaretta come memoria automatica, non piacere puro.',
    cta: CTA_DEFAULT,
    scenes: [
      { type: 'title', text: 'Mi manca davvero fumare.' },
      { type: 'thought', text: 'A volte non manca la sigaretta. Manca il gesto. L’ora. Il posto dove arrivava sempre.' },
      { type: 'break', text: 'È memoria, non piacere.' },
      { type: 'thought', text: 'E quando il vuoto arriva e non lo riempi, guarda bene: passa lo stesso.' },
      { type: 'notice', text: 'I momenti in cui il vuoto passa da solo, più in fretta di quanto credevi.' },
    ],
    body: [
      'A volte non manca la sigaretta. Manca il gesto. L’ora. Il posto dove arrivava sempre.',
      'È memoria, non piacere — un rituale che cerca ancora il suo posto.',
      'E quando il vuoto arriva e non lo riempi, guarda bene: passa lo stesso.',
      'Più in fretta di quanto la nostalgia ti aveva promesso.',
    ],
  },
  {
    day: 6,
    headline: 'Vederlo gli toglie presa.',
    interaction: {
      question: 'Quanto suona ragionevole, adesso, "solo una"?',
      options: [
        { label: 'Per niente', feedback: 'Lo stai già vedendo per quello che è. È così che perde presa.' },
        { label: 'Un po’', feedback: 'Quel "un po’" è la porta. Vederla aperta basta per non passarci.' },
        { label: 'Molto', feedback: 'Suona ragionevole perché è costruita così. Riconoscerlo è già mezzo passo fuori.' },
      ],
    },
    illusione: 'Una sola non cambia nulla.',
    nuovaPercezione: 'Il cervello usa la sensazione di controllo per riaprire il ciclo.',
    osservazione: 'Notare quanto "solo una" sembri sempre ragionevole.',
    statoFinale: 'Diffidenza verso le razionalizzazioni improvvise.',
    cta: CTA_DEFAULT,
    scenes: [
      { type: 'title', text: 'Una sola non cambia nulla.' },
      { type: 'thought', text: 'Sembra sempre ragionevole. È costruita per sembrarlo.' },
      { type: 'thought', text: 'È così che il cervello riapre la porta: usando la tua sensazione di controllo contro di te.' },
      { type: 'break', text: 'Oggi non discutere con il pensiero. Guardalo arrivare.' },
      { type: 'notice', text: 'Nel momento in cui lo vedi per quello che è, perde un po’ di presa.' },
    ],
    body: [
      '"Solo una" sembra sempre ragionevole. È costruita per sembrarlo: è così che il cervello riapre la porta, usando la tua sensazione di controllo contro di te.',
      'Oggi non discutere con il pensiero. Guardalo arrivare.',
      'Nel momento in cui lo vedi per quello che è, perde un po’ di presa.',
    ],
  },
  {
    day: 7,
    headline: 'Non è resistere per sempre.',
    interaction: {
      question: 'Dov’è il primo posto dove il craving non si è più presentato?',
      options: [
        { label: 'Il mattino', feedback: 'Un posto dove prima arrivava sempre. Ora è vuoto. Non l’hai deciso: è successo.' },
        { label: 'Dopo i pasti', feedback: 'Era uno dei più automatici. Se lì si allenta, si allenta ovunque.' },
        { label: 'In auto', feedback: 'Uno dei trigger più forti. La sua assenza dice più di mille buoni propositi.' },
        { label: 'Non ancora', feedback: 'Va bene. Non è una gara. Stai solo iniziando a guardare nei posti giusti.' },
      ],
    },
    illusione: 'Smettere significa resistere per sempre.',
    nuovaPercezione: 'Non è una battaglia eterna di volontà: gli automatismi che hai osservato stanno già svanendo da soli.',
    osservazione: 'Notare i momenti in cui il craving non arriva dove prima arrivava sempre.',
    statoFinale: 'Primo spostamento identitario silenzioso. Non euforia, non vittoria: solo "qualcosa sta cambiando".',
    cta: 'Vado avanti',
    scenes: [
      { type: 'title', text: 'Smettere significa resistere per sempre.' },
      { type: 'thought', text: 'Ma la resistenza serve contro qualcosa di vivo.' },
      { type: 'thought', text: 'E alcuni di questi automatismi li hai già visti spegnersi.' },
      { type: 'notice', text: 'I posti dove il craving non si è presentato. Quelli dove prima arrivava sempre.' },
      { type: 'break', text: 'Non è euforia. Non è una vittoria.' },
      { type: 'break', text: 'È solo qualcosa che sta cambiando.' },
    ],
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

// True se l'utente è ancora dentro la finestra dei 7 giorni (giorni 1..7).
// Dopo il giorno 7 il "Momento di oggi" non si mostra più in Home.
export function isInPercorsoWindow(quitDate, now = new Date()) {
  if (!quitDate) return false;
  const start = new Date(quitDate);
  if (Number.isNaN(start.getTime())) return false;
  const days = Math.floor((now - start) / 86_400_000);
  return days >= 0 && days < TOTAL_DAYS;
}

// week1 = i 7 capitoli storici (CHAPTERS), invariati. Le settimane 2-4 vivono
// in file separati (week2/3/4.js) con lo stesso schema. allMoments è l'elenco
// completo dei 28 momenti, ordinato per giorno.
export const week1 = CHAPTERS;
export const allMoments = [...week1, ...week2, ...week3, ...week4];

export function getChapter(day) {
  return allMoments.find((c) => c.day === day) || null;
}

// Comodità per il flusso "momenti": ritorna il momento del giorno corrente.
export function getMomentOfDay(quitDate, now = new Date()) {
  return getChapter(getCurrentDay(quitDate, now));
}

// True se il momento di quel giorno è già sbloccato (giorno <= giorno corrente).
export function isMomentUnlocked(giorno, quitDate, now = new Date()) {
  return giorno >= 1 && giorno <= getCurrentDay(quitDate, now);
}
