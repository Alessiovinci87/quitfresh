// ─────────────────────────────────────────────────────────────────────────
// PERCORSO — Settimana 2 (G8–G14) · fase 2
// Stesso schema dei 7 giorni in ../percorso.js: day, fase, headline,
// interaction{question, options[{label,feedback}]}, illusione/nuovaPercezione/
// osservazione/statoFinale (mappa), cta, scenes[{type,text}], body.
// Tono osservativo, mai motivazionale, ogni momento chiude su un'apertura.
// ─────────────────────────────────────────────────────────────────────────

const CTA_DEFAULT = 'Lo terrò d’occhio oggi';

export const week2 = [
  {
    day: 8,
    fase: 2,
    headline: 'C’è un secondo prima.',
    interaction: {
      question: 'Quel secondo prima del gesto — riesci a vederlo?',
      options: [
        { label: 'Quasi mai', feedback: 'Normale: è velocissimo. Ma adesso che sai che esiste, prima o poi lo coglierai.' },
        { label: 'A volte', feedback: 'Quel "a volte" è tutto. È lì che il gesto smette di essere inevitabile.' },
        { label: 'Spesso', feedback: 'Allora hai già trovato lo spazio. Non devi riempirlo: basta restarci un attimo.' },
      ],
    },
    illusione: 'L’impulso e il gesto sono la stessa cosa.',
    nuovaPercezione: 'Tra l’impulso e la mano che si muove c’è un istante. Piccolo, ma esiste.',
    osservazione: 'Provare a notare lo spazio tra il volere e l’accendere.',
    statoFinale: 'Prima percezione di un margine dove prima sembrava tutto automatico.',
    cta: CTA_DEFAULT,
    scenes: [
      { type: 'title', text: 'L’impulso arriva e la mano si muove. Sembrano la stessa cosa.' },
      { type: 'thought', text: 'Non lo sono. In mezzo c’è un secondo.' },
      { type: 'break', text: 'Un secondo intero.' },
      { type: 'thought', text: 'Non devi farci niente. Solo sapere che c’è già lo allarga un po’.' },
      { type: 'notice', text: 'Quell’istante tra “lo voglio” e la mano che parte.' },
    ],
    body: null,
  },
  {
    day: 9,
    fase: 2,
    headline: 'La voce che tratta.',
    interaction: {
      question: 'Cosa ti dice di solito, quella voce?',
      options: [
        { label: '“Solo oggi”', feedback: 'È la più vecchia delle offerte. Suona generosa, ma chiede sempre la stessa cosa.' },
        { label: '“Te la sei meritata”', feedback: 'Trasforma il fumo in premio. Ma nota: il premio lo decide lei, non tu.' },
        { label: '“Una non conta”', feedback: 'Conta proprio perché te lo deve far credere. Altrimenti non insisterebbe.' },
      ],
    },
    illusione: 'Sono io che sto ragionando.',
    nuovaPercezione: 'La voce che negozia non vuole il tuo bene: vuole solo riaprire il ciclo.',
    osservazione: 'Ascoltare il tono della voce, non solo le parole.',
    statoFinale: 'La trattativa interna inizia a suonare come un copione già sentito.',
    cta: CTA_DEFAULT,
    scenes: [
      { type: 'title', text: 'A volte ti sembra di ragionare con te stesso.' },
      { type: 'thought', text: 'Ma ascolta meglio: la voce porta sempre le stesse offerte.' },
      { type: 'thought', text: '“Solo oggi.” “Te la sei meritata.” “Una non conta.”' },
      { type: 'break', text: 'Non sta ragionando. Sta trattando.' },
      { type: 'notice', text: 'Le frasi che torna a dirti, sempre uguali.' },
    ],
    body: null,
  },
  {
    day: 10,
    fase: 2,
    headline: 'E poi passa.',
    interaction: {
      question: 'Quando il craving se ne va da solo, cosa resta?',
      options: [
        { label: 'Sollievo', feedback: 'Hai visto una cosa: non era una richiesta da soddisfare, era un’onda da aspettare.' },
        { label: 'Sorpresa', feedback: 'La sorpresa è il punto. Ti aspettavi che durasse. Non dura.' },
        { label: 'Niente di che', feedback: '“Niente di che” è enorme: vuol dire che il craving prometteva più di quanto manteneva.' },
      ],
    },
    illusione: 'Il craving cresce finché non cedo.',
    nuovaPercezione: 'Il craving ha una curva: sale, tocca un picco, e scende da solo se non lo nutri.',
    osservazione: 'Notare cosa sente il corpo qualche minuto dopo, quando l’onda è passata.',
    statoFinale: 'Prima prova diretta che l’onda finisce anche senza fumare.',
    cta: CTA_DEFAULT,
    scenes: [
      { type: 'title', text: 'Sembra che il craving cresca finché non cedi.' },
      { type: 'thought', text: 'Ma guarda cosa fa se non lo nutri: sale, si gonfia…' },
      { type: 'break', text: 'e poi scende.' },
      { type: 'thought', text: 'Qualche minuto dopo il corpo è di nuovo tranquillo. Da solo.' },
      { type: 'notice', text: 'Come ti senti dieci minuti dopo, quando l’onda è già passata.' },
    ],
    body: null,
  },
  {
    day: 11,
    fase: 2,
    headline: 'Trigger che non conoscevi.',
    interaction: {
      question: 'In questi giorni, da dove è arrivata una voglia inaspettata?',
      options: [
        { label: 'Una buona notizia', feedback: 'Curioso: non solo lo stress. Anche la gioia cercava il suo gesto.' },
        { label: 'Un momento di noia', feedback: 'La noia è un trigger silenzioso. Non fa rumore, ma chiama lo stesso.' },
        { label: 'Un odore, un posto', feedback: 'Il mondo è pieno di segnali che avevi associato. Ora li senti scollegarsi.' },
      ],
    },
    illusione: 'Ormai conosco tutti i miei trigger.',
    nuovaPercezione: 'I primi giorni cadono i trigger ovvi; poi emergono quelli che non avevi mai notato.',
    osservazione: 'Stare attento ai craving che arrivano da situazioni nuove, non solo dalle solite.',
    statoFinale: 'Consapevolezza che la mappa dei trigger è più ampia di come sembrava.',
    cta: CTA_DEFAULT,
    scenes: [
      { type: 'title', text: 'Pensavi di conoscerli tutti, i tuoi momenti.' },
      { type: 'thought', text: 'Poi ne arriva uno da un posto nuovo. Una buona notizia. Un attimo di noia.' },
      { type: 'break', text: 'Non erano nella lista.' },
      { type: 'thought', text: 'Non è un passo indietro. È che ora vedi anche quelli più nascosti.' },
      { type: 'notice', text: 'Il craving che arriva da una situazione che non ti aspettavi.' },
    ],
    body: null,
  },
  {
    day: 12,
    fase: 2,
    headline: 'Quando sei stanco, salta la guardia.',
    interaction: {
      question: 'Quando sei esausto, il pensiero del fumo come arriva?',
      options: [
        { label: 'Più insistente', feedback: 'La stanchezza non crea il desiderio: abbassa il filtro che lo teneva a distanza.' },
        { label: 'Più ragionevole', feedback: 'È un trucco noto: stanco, “una” sembra logica. Non ragioni diverso, hai solo la guardia bassa.' },
        { label: 'Agisco e basta', feedback: 'Ecco il cortocircuito: salti il secondo prima. Saperlo, da stanco, è già qualcosa.' },
      ],
    },
    illusione: 'La stanchezza mi fa venire più voglia.',
    nuovaPercezione: 'La stanchezza non aumenta il desiderio: spegne la parte di te che lo osservava.',
    osservazione: 'Riconoscere che da stanchi il pensiero è meno lucido, non più vero.',
    statoFinale: 'La stanchezza diventa un segnale da riconoscere, non una scusa che convince.',
    cta: CTA_DEFAULT,
    scenes: [
      { type: 'title', text: 'Da stanco, “una sigaretta” sembra di colpo ragionevole.' },
      { type: 'thought', text: 'Non è che ragioni meglio. È che la parte che osservava si è spenta.' },
      { type: 'break', text: 'Guardia bassa.' },
      { type: 'thought', text: 'Il desiderio non è cresciuto. È solo rimasto senza nessuno a guardarlo.' },
      { type: 'notice', text: 'Come cambia il pensiero del fumo quando sei esausto.' },
    ],
    body: null,
  },
  {
    day: 13,
    fase: 2,
    headline: 'Il ricordo mente un po’.',
    interaction: {
      question: 'Quando ricordi una sigaretta, com’è?',
      options: [
        { label: 'Perfetta', feedback: 'La memoria tiene il meglio e butta il resto. Quella perfetta, fumata, era spesso solo automatica.' },
        { label: 'Legata a un bel momento', feedback: 'Era il momento a essere bello. La sigaretta era lì accanto, e si è presa il merito.' },
        { label: 'Non così speciale', feedback: 'Allora la stai già vedendo nuda. Senza l’alone che il ricordo le cuce addosso.' },
      ],
    },
    illusione: 'Ricordo quanto era buona.',
    nuovaPercezione: 'La memoria conserva la versione idealizzata, non quella reale e spesso indifferente.',
    osservazione: 'Confrontare il ricordo della sigaretta con com’era davvero, di solito.',
    statoFinale: 'Sospetto che la nostalgia stia descrivendo qualcosa che non esisteva così.',
    cta: CTA_DEFAULT,
    scenes: [
      { type: 'title', text: 'Ti torna in mente una sigaretta. Ed era perfetta.' },
      { type: 'thought', text: 'Ma la memoria fa questo: tiene il meglio, cancella le decine identiche e automatiche.' },
      { type: 'break', text: 'Quella perfetta forse non c’è mai stata.' },
      { type: 'thought', text: 'Stai sentendo la mancanza di un ricordo, non di un fatto.' },
      { type: 'notice', text: 'Quanto la sigaretta ricordata somiglia a quelle che fumavi davvero.' },
    ],
    body: null,
  },
  {
    day: 14,
    fase: 2,
    headline: 'Due settimane.',
    interaction: {
      question: 'Due settimane. Cosa noti, senza giudicare?',
      options: [
        { label: 'Meno craving', feedback: 'Annotalo e basta. Non è un traguardo da festeggiare: è un dato che hai osservato.' },
        { label: 'Stessa fatica', feedback: 'Va bene anche così. La fatica che resta è informazione, non fallimento.' },
        { label: 'Mi sembra normale', feedback: 'Che “smettere” cominci a sembrare normale è forse la cosa più grande, detta nel modo più piccolo.' },
      ],
    },
    illusione: 'A due settimane dovrei sentirmi in un certo modo.',
    nuovaPercezione: 'Il cambiamento non si presenta come un evento: si nota solo guardandosi indietro, di sfuggita.',
    osservazione: 'Registrare cosa è diverso, senza decidere se è poco o tanto.',
    statoFinale: 'Punto di osservazione neutro: né vittoria né resa, solo un guardare indietro.',
    cta: 'Vado avanti',
    scenes: [
      { type: 'title', text: 'Due settimane.' },
      { type: 'thought', text: 'Niente fuochi d’artificio. Probabilmente è una giornata come un’altra.' },
      { type: 'break', text: 'Ed è proprio quello il punto.' },
      { type: 'thought', text: 'Non guardare come ti senti. Guarda cosa è diventato normale senza accorgertene.' },
      { type: 'notice', text: 'Una cosa che oggi non pesa più come pesava il primo giorno.' },
    ],
    body: null,
  },
];
