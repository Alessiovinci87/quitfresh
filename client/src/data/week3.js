// ─────────────────────────────────────────────────────────────────────────
// PERCORSO — Settimana 3 (G15–G21) · fase 3
// Stesso schema dei 7 giorni in ../percorso.js. Tono osservativo, mai
// motivazionale, ogni momento chiude su un'apertura.
// ─────────────────────────────────────────────────────────────────────────

const CTA_DEFAULT = 'Lo terrò d’occhio oggi';

export const week3 = [
  {
    day: 15,
    fase: 3,
    headline: '“Io sono uno che fuma.”',
    interaction: {
      question: 'Quella frase — “io sono un fumatore” — adesso quanto ti calza?',
      options: [
        { label: 'Ancora tanto', feedback: 'Normale: l’hai indossata per anni. Ma ora la guardi da fuori. Prima eri dentro.' },
        { label: 'Meno di prima', feedback: 'Si sta scucendo. Non l’hai strappata via: si sta solo slacciando da sola.' },
        { label: 'Non mi rappresenta più', feedback: 'Allora non è “smettere di fumare”. È che quella descrizione ha smesso di essere tua.' },
      ],
    },
    illusione: 'Sono fatto così, sono un fumatore.',
    nuovaPercezione: '“Essere un fumatore” non è un’identità: è una descrizione abituale che puoi smettere di ripetere.',
    osservazione: 'Notare quante volte ti racconti ancora come “uno che fuma”.',
    statoFinale: 'L’identità di fumatore inizia a sembrare un vestito, non la pelle.',
    cta: CTA_DEFAULT,
    scenes: [
      { type: 'title', text: 'Per anni ti sei detto: io sono uno che fuma.' },
      { type: 'thought', text: 'Non era vero. Era una frase ripetuta tante volte da sembrare vera.' },
      { type: 'break', text: 'Una descrizione, non te.' },
      { type: 'thought', text: 'E le descrizioni, quando smetti di ripeterle, sbiadiscono.' },
      { type: 'notice', text: 'Quante volte oggi ti definisci ancora attraverso il fumo.' },
    ],
    body: null,
  },
  {
    day: 16,
    fase: 3,
    headline: 'Quando te la offrono.',
    interaction: {
      question: 'Qualcuno ti offre una sigaretta. La prima cosa che senti?',
      options: [
        { label: 'Tentazione', feedback: 'Nota: la voglia è arrivata dall’offerta, non da dentro di te. È esterna.' },
        { label: 'Imbarazzo a dire no', feedback: 'Spesso non è la sigaretta a chiamarti. È non voler rompere il momento. Due cose diverse.' },
        { label: 'Niente, ormai', feedback: 'Allora hai visto che il gesto degli altri non è più un tuo ordine.' },
      ],
    },
    illusione: 'Se me la offrono, la voglia è mia.',
    nuovaPercezione: 'L’offerta esterna accende un riflesso sociale, non un bisogno tuo.',
    osservazione: 'Distinguere il desiderio interno dal semplice non voler dire di no.',
    statoFinale: 'Il gesto sociale si separa dal bisogno personale.',
    cta: CTA_DEFAULT,
    scenes: [
      { type: 'title', text: 'Te la offrono, e qualcosa dentro si muove.' },
      { type: 'thought', text: 'Ma guarda da dove arriva: dall’offerta, non da te.' },
      { type: 'thought', text: 'E spesso non è nemmeno la sigaretta. È non voler dire di no.' },
      { type: 'break', text: 'Due cose diverse.' },
      { type: 'notice', text: 'Cosa senti davvero quando qualcuno accende accanto a te.' },
    ],
    body: null,
  },
  {
    day: 17,
    fase: 3,
    headline: 'Perché, davvero.',
    interaction: {
      question: 'Sotto tutto — cosa cercavi davvero nel fumo?',
      options: [
        { label: 'Una pausa', feedback: 'Allora il bisogno era staccare, non nicotina. E le pause puoi prenderle comunque.' },
        { label: 'Gestire le emozioni', feedback: 'Era una maniglia per emozioni difficili. Tolta la maniglia, restano le emozioni — e si imparano a tenere.' },
        { label: 'Qualcosa da fare', feedback: 'Era un riempitivo per i vuoti e le mani. Quei vuoti adesso chiedono solo altro.' },
      ],
    },
    illusione: 'Fumavo perché mi piaceva fumare.',
    nuovaPercezione: 'Sotto il fumo c’era quasi sempre un altro bisogno, mascherato da abitudine.',
    osservazione: 'Cercare la funzione vera che la sigaretta svolgeva per te.',
    statoFinale: 'Il fumo appare come copertura di un bisogno che ora si può guardare in faccia.',
    cta: CTA_DEFAULT,
    scenes: [
      { type: 'title', text: 'Dicevi: mi piace fumare.' },
      { type: 'thought', text: 'Ma sotto c’era quasi sempre altro. Una pausa. Un modo per reggere un’emozione. Un vuoto.' },
      { type: 'break', text: 'La sigaretta era solo la maniglia.' },
      { type: 'thought', text: 'Tolta la maniglia, resta il bisogno vero. E quello lo puoi finalmente guardare.' },
      { type: 'notice', text: 'Cosa stava facendo per te, davvero, l’ultima sigaretta che ricordi.' },
    ],
    body: null,
  },
  {
    day: 18,
    fase: 3,
    headline: 'La pausa, senza.',
    interaction: {
      question: 'Adesso, in una pausa senza sigaretta, cosa fai?',
      options: [
        { label: 'Non so che fare delle mani', feedback: 'È la parte più fisica dell’abitudine. Le mani imparano un nuovo gesto in fretta, se gliene dai uno.' },
        { label: 'Mi sembra più corta', feedback: 'Era la sigaretta a darle inizio e fine. La pausa esiste anche senza quei confini.' },
        { label: 'La vivo e basta', feedback: 'Allora hai scoperto che la pausa non aveva bisogno del fumo per essere una pausa.' },
      ],
    },
    illusione: 'Senza sigaretta non so più fare una pausa.',
    nuovaPercezione: 'La pausa era una cosa a sé; il fumo le si era solo attaccato sopra.',
    osservazione: 'Osservare cosa cerchi con le mani e con il tempo, in una pausa.',
    statoFinale: 'La pausa comincia a esistere per conto suo, senza il gesto.',
    cta: CTA_DEFAULT,
    scenes: [
      { type: 'title', text: 'Una pausa, senza sigaretta. E non sai bene cosa farne.' },
      { type: 'thought', text: 'Le mani cercano qualcosa. Il tempo sembra senza forma.' },
      { type: 'break', text: 'Era la sigaretta a darle i bordi.' },
      { type: 'thought', text: 'Ma la pausa c’era già prima di lei. Sta solo tornando a essere sé stessa.' },
      { type: 'notice', text: 'Cosa cercano le tue mani quando ti fermi un momento.' },
    ],
    body: null,
  },
  {
    day: 19,
    fase: 3,
    headline: 'Lo vedi, negli altri.',
    interaction: {
      question: 'Guardando ora chi fuma, cosa noti?',
      options: [
        { label: 'Il gesto automatico', feedback: 'Lo vedi da fuori adesso: la mano che parte da sola. Era anche il tuo.' },
        { label: 'Che non se la godono', feedback: 'Esatto: molti fumano guardando altrove, senza accorgersene. Lo facevi anche tu.' },
        { label: 'Un po’ di invidia', feedback: 'Onesto. Ma guarda la scena, non solo la sigaretta: spesso non c’è il piacere che immagini.' },
      ],
    },
    illusione: 'Chi fuma si sta godendo qualcosa che io mi nego.',
    nuovaPercezione: 'Visto da fuori, il fumo altrui rivela l’automatismo che da dentro non vedevi.',
    osservazione: 'Osservare chi fuma come se guardassi il meccanismo, non la persona.',
    statoFinale: 'Il meccanismo, visto negli altri, conferma quello che hai visto in te.',
    cta: CTA_DEFAULT,
    scenes: [
      { type: 'title', text: 'Guarda qualcuno che fuma, adesso.' },
      { type: 'thought', text: 'La mano che parte da sola. Lo sguardo altrove. Spesso nemmeno il piacere.' },
      { type: 'break', text: 'Lo vedi da fuori.' },
      { type: 'thought', text: 'È lo stesso meccanismo che da dentro ti sembrava una scelta.' },
      { type: 'notice', text: 'Da fuori si vede meglio.' },
    ],
    body: null,
  },
  {
    day: 20,
    fase: 3,
    formato: 'frase_singola',
    headline: 'Attraversare, non aggirare.',
    interaction: {
      question: 'Hai attraversato un momento difficile senza fumare. Cosa hai imparato?',
      options: [
        { label: 'Che si può', feedback: 'Sì. Non che è facile: che si può. È un dato che adesso possiedi.' },
        { label: 'È durato meno del previsto', feedback: 'Come il craving: anche il momento difficile ha una curva. Sale e scende.' },
        { label: 'Il fumo non c’entrava', feedback: 'Ecco il punto: la sigaretta non risolveva la situazione. La copriva soltanto.' },
      ],
    },
    illusione: 'In certi momenti senza una sigaretta non ce la faccio.',
    nuovaPercezione: 'Le situazioni difficili si attraversano comunque; il fumo non le risolveva, le rinviava.',
    osservazione: 'Notare cosa succede davvero quando attraversi un momento duro senza fumare.',
    statoFinale: 'Prima prova che i momenti difficili sono attraversabili così come sono.',
    cta: CTA_DEFAULT,
    scenes: [
      { type: 'title', text: 'La sigaretta non l’avrebbe risolto. Avrebbe solo aggiunto fumo al momento.' },
      { type: 'thought', text: 'Poi uno di quei momenti è arrivato. E l’hai attraversato.' },
      { type: 'break', text: 'È passato lo stesso.' },
      { type: 'notice', text: 'Un momento difficile che hai attraversato intero, senza.' },
    ],
    body: null,
  },
  {
    day: 21,
    fase: 3,
    formato: 'frase_singola',
    headline: 'Non è uno sforzo.',
    interaction: {
      question: 'Quando non hai pensato al fumo per ore — com’è successo?',
      options: [
        { label: 'Non me ne sono accorto', feedback: 'Ecco la libertà vera: non resistere tutto il giorno. È che il pensiero non è arrivato.' },
        { label: 'Ero preso da altro', feedback: 'La vita ha riempito lo spazio da sola. Non hai dovuto spingere via niente.' },
        { label: 'Non succede ancora', feedback: 'Va bene. Succede a pezzi, prima. Un’ora qui, una là. Le noterai dopo.' },
      ],
    },
    illusione: 'Essere libero dal fumo significa resistere ogni giorno.',
    nuovaPercezione: 'La libertà non è uno sforzo continuo: è l’assenza del pensiero, che arriva quando smetti di combatterlo.',
    osservazione: 'Accorgerti delle ore in cui il fumo semplicemente non si è fatto vivo.',
    statoFinale: 'La libertà si rivela come assenza di lotta, non come lotta vinta.',
    cta: 'Vado avanti',
    scenes: [
      { type: 'title', text: 'Immaginavi la libertà come una resistenza ben riuscita.' },
      { type: 'thought', text: 'Ma guarda le ore in cui non ci hai pensato affatto.' },
      { type: 'break', text: 'Lì non stavi resistendo.' },
      { type: 'thought', text: 'Il pensiero non è arrivato. Quella, e non lo sforzo, è la libertà.' },
      { type: 'notice', text: 'Le ore in cui il fumo non si è proprio fatto vivo.' },
    ],
    body: null,
  },
];
