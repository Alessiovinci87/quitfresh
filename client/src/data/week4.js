// ─────────────────────────────────────────────────────────────────────────
// PERCORSO — Settimana 4 (G22–G28) · fase 4
// Stesso schema dei 7 giorni in ../percorso.js. Tono osservativo, mai
// motivazionale. G28 non chiude il percorso: lo lascia aperto.
// ─────────────────────────────────────────────────────────────────────────

const CTA_DEFAULT = 'Lo terrò d’occhio oggi';

export const week4 = [
  {
    day: 22,
    fase: 4,
    headline: 'Il quasi.',
    interaction: {
      question: 'C’è stato un “quasi” — eri a un passo. Cosa l’ha fermato?',
      options: [
        { label: 'Mi sono visto', feedback: 'Quello sguardo su te stesso è la cosa nuova. Prima non c’era nessuno a guardare.' },
        { label: 'È passato da solo', feedback: 'Hai aspettato l’onda invece di cavalcarla. Adesso sai che scende.' },
        { label: 'Non lo so', feedback: 'Va bene non saperlo. A volte basta non aver agito. Il “quasi” non è una ricaduta.' },
      ],
    },
    illusione: 'Se sono arrivato a un passo, ho quasi fallito.',
    nuovaPercezione: 'Il “quasi” non è un fallimento sfiorato: è la prova che ora c’è uno spazio tra impulso e gesto.',
    osservazione: 'Guardare un “quasi” come informazione, non come colpa.',
    statoFinale: 'Il “quasi” diventa misura del margine guadagnato, non del rischio corso.',
    cta: CTA_DEFAULT,
    scenes: [
      { type: 'title', text: 'Eri a un centimetro. Quasi.' },
      { type: 'thought', text: 'La vecchia voce dice: hai rischiato, hai quasi fallito.' },
      { type: 'break', text: 'Ma guardalo al contrario.' },
      { type: 'thought', text: 'C’era uno spazio in cui fermarti. Mesi fa non ci sarebbe stato: avresti già fumato.' },
      { type: 'notice', text: 'Cosa, esattamente, si è messo in mezzo nel tuo ultimo “quasi”.' },
    ],
    body: null,
  },
  {
    day: 23,
    fase: 4,
    headline: 'Ricadere senza fumare.',
    interaction: {
      question: 'A volte la testa torna a fumare anche se tu no. Come ti suona?',
      options: [
        { label: 'Come un tradimento', feedback: 'Non lo è. Il pensiero che torna non cancella i giorni: è un’abitudine vecchia che ripassa.' },
        { label: 'Spaventoso', feedback: 'Lo è meno se lo nomini: questa è una ricaduta solo mentale. Le mani non hanno fatto niente.' },
        { label: 'Lo lascio passare', feedback: 'Allora hai già la cosa più importante: il pensiero non è un ordine.' },
      ],
    },
    illusione: 'Se penso ancora a fumare, non sono cambiato davvero.',
    nuovaPercezione: 'Il pensiero del fumo può tornare a lungo: è memoria, non ricaduta. Conta solo cosa fanno le mani.',
    osservazione: 'Distinguere il pensiero che torna dal gesto che non c’è.',
    statoFinale: 'Il pensiero ricorrente si separa dall’azione: pensare non è ricadere.',
    cta: CTA_DEFAULT,
    scenes: [
      { type: 'title', text: 'A volte la mente torna là. Si rivede a fumare.' },
      { type: 'thought', text: 'E ti sembra di essere tornato indietro.' },
      { type: 'break', text: 'Ma le mani non hanno fatto niente.' },
      { type: 'thought', text: 'È un ricordo che ripassa, non un passo all’indietro. Il pensiero non è un ordine.' },
      { type: 'notice', text: 'La differenza tra il pensiero che arriva e la mano che resta ferma.' },
    ],
    body: null,
  },
  {
    day: 24,
    fase: 4,
    headline: 'Un mese.',
    interaction: {
      question: 'Un mese. E forse dentro non senti niente di speciale.',
      options: [
        { label: 'Vero, niente di speciale', feedback: 'È così che cambia chi cambia davvero: senza musica di sottofondo. Il fatto è lì comunque.' },
        { label: 'Quasi me ne dimentico', feedback: 'Dimenticarsene è il segno migliore: non è più una battaglia da ricordare ogni ora.' },
        { label: 'Mi aspettavo di più', feedback: 'Lo so. Ma il cambiamento non è un’emozione: è una somma di giorni che non senti passare.' },
      ],
    },
    illusione: 'A un mese dovrei sentirmi trasformato.',
    nuovaPercezione: 'Il cambiamento reale è silenzioso: si misura nei fatti accumulati, non in una sensazione.',
    osservazione: 'Guardare i fatti del mese, non l’emozione che ti aspettavi.',
    statoFinale: 'Il cambiamento si accetta come fatto silenzioso, non come evento sentito.',
    cta: 'Vado avanti',
    scenes: [
      { type: 'title', text: 'Un mese. E dentro, forse, non senti granché.' },
      { type: 'thought', text: 'Niente trasformazione, niente musica. Una giornata qualunque.' },
      { type: 'break', text: 'È proprio così che succede.' },
      { type: 'thought', text: 'Il cambiamento non è un’emozione. È una pila di giorni che non ti sei accorto di vivere.' },
      { type: 'notice', text: 'Un fatto concreto di questo mese, al posto di una sensazione.' },
    ],
    body: null,
  },
  {
    day: 25,
    fase: 4,
    formato: 'frase_singola',
    headline: 'Quando bevi, cala la guardia.',
    interaction: {
      question: 'Con un bicchiere in mano, il pensiero del fumo come arriva?',
      options: [
        { label: 'Improvviso e forte', feedback: 'L’alcol non aumenta la voglia: spegne il secondo prima. Saperlo da lucido è la tua difesa.' },
        { label: '“Stasera non conta”', feedback: 'È l’offerta più vecchia in versione brilla. Conta esattamente come gli altri giorni.' },
        { label: 'Lo gestisco', feedback: 'Bene. Decidere a mente fredda cosa farai a mente annebbiata è metà del lavoro.' },
      ],
    },
    illusione: 'Un bicchiere e la voglia diventa irresistibile.',
    nuovaPercezione: 'L’alcol non crea il desiderio: disattiva la parte che lo osservava, come la stanchezza.',
    osservazione: 'Riconoscere in anticipo che da brillo il filtro è più basso, non il desiderio più alto.',
    statoFinale: 'L’alcol si rivela come abbassa-guardia prevedibile, non come tentazione invincibile.',
    cta: CTA_DEFAULT,
    scenes: [
      { type: 'title', text: 'Un paio di bicchieri, e di colpo “una sigaretta” sembra ovvia.' },
      { type: 'thought', text: 'Non è la voglia a essere cresciuta.' },
      { type: 'break', text: 'È la guardia a essersi abbassata.' },
      { type: 'thought', text: 'Stesso meccanismo della stanchezza: la parte che osservava si addormenta.' },
      { type: 'notice', text: 'Come decidi, ora che sei lucido, cosa farai quando non lo sarai.' },
    ],
    body: null,
  },
  {
    day: 26,
    fase: 4,
    headline: 'L’unica uscita, apparente.',
    interaction: {
      question: 'Sotto stress forte, il fumo si presenta come…',
      options: [
        { label: 'L’unica via', feedback: 'Lo stress restringe la vista a una sola porta. Ma è un effetto suo, non la realtà della stanza.' },
        { label: 'Una valvola', feedback: 'Sembra scaricare. In realtà sposta lo sguardo per pochi minuti, e lo stress resta intatto.' },
        { label: 'Un automatismo', feedback: 'Sotto pressione torna il gesto più vecchio. Vederlo come vecchio, non come soluzione, cambia tutto.' },
      ],
    },
    illusione: 'Quando lo stress è insopportabile, fumare è l’unica uscita.',
    nuovaPercezione: 'Lo stress restringe la percezione a una sola opzione; il fumo non scarica nulla, sposta solo lo sguardo.',
    osservazione: 'Notare come lo stress fa sembrare il fumo l’unica porta della stanza.',
    statoFinale: 'Il fumo perde lo statuto di “uscita”: resta un gesto vecchio sotto pressione.',
    cta: CTA_DEFAULT,
    scenes: [
      { type: 'title', text: 'Lo stress sale, e il fumo sembra l’unica uscita.' },
      { type: 'thought', text: 'È lo stress a far sembrare che ci sia una sola porta.' },
      { type: 'break', text: 'Ma la stanza ne ha altre.' },
      { type: 'thought', text: 'La sigaretta non scarica niente: sposta lo sguardo per cinque minuti. Lo stress resta dov’è.' },
      { type: 'notice', text: 'Quante porte vedi, se ti fermi un istante invece di correre alla prima.' },
    ],
    body: null,
  },
  {
    day: 27,
    fase: 4,
    headline: 'La trappola elegante.',
    interaction: {
      question: 'Arriva il pensiero: “ormai sono libero, potrei gestirne una”. Lo riconosci?',
      options: [
        { label: 'Sì, e mi spaventa', feedback: 'Bene che ti spaventi. È la trappola più raffinata: usa la tua libertà come esca.' },
        { label: 'Suona ragionevole', feedback: 'Suona così perché arriva tardi, quando ti fidi di te. È costruita per il te di adesso.' },
        { label: 'Non ci casco', feedback: 'Allora l’hai vista: non una prova di forza da superare, ma un amo da non mordere.' },
      ],
    },
    illusione: 'Ora che controllo, posso permettermene una ogni tanto.',
    nuovaPercezione: 'La trappola più sofisticata non attacca la debolezza: usa la sicurezza appena conquistata come esca.',
    osservazione: 'Riconoscere il pensiero che ti propone una sigaretta proprio in nome della tua libertà.',
    statoFinale: 'L’ultima razionalizzazione si svela: la libertà usata come grimaldello.',
    cta: CTA_DEFAULT,
    scenes: [
      { type: 'title', text: '“Ormai sono libero. Una, ora, potrei gestirla.”' },
      { type: 'thought', text: 'È la trappola più elegante di tutte.' },
      { type: 'thought', text: 'Non colpisce la debolezza. Aspetta la forza, e la usa come esca.' },
      { type: 'break', text: 'Arriva proprio quando ti fidi di te.' },
      { type: 'notice', text: 'Il pensiero che ti offre una sigaretta in nome della tua stessa libertà.' },
    ],
    body: null,
  },
  {
    day: 28,
    fase: 4,
    formato: 'silenzio',
    headline: 'Cosa vedi, adesso.',
    interaction: {
      question: 'Alla fine di tutto questo guardare — cosa vedi ora che all’inizio non vedevi?',
      options: [
        { label: 'Il gesto prima del pensiero', feedback: 'L’hai visto al giorno uno e non hai più smesso. Era da lì che partiva tutto.' },
        { label: 'Che non era una scelta', feedback: 'E vederlo è esattamente ciò che, piano, ha tolto l’automatismo.' },
        { label: 'Che posso solo guardare', feedback: 'Forse è questa la cosa. Non hai vinto combattendo. Hai guardato finché la presa si è allentata.' },
      ],
    },
    illusione: 'Smettere è stato un atto di volontà.',
    nuovaPercezione: 'Non hai vinto una battaglia: hai guardato il meccanismo finché ha perso presa. Resta solo da continuare a guardare.',
    osservazione: 'Tenere lo sguardo che hai allenato in questi giorni. Non serve altro.',
    statoFinale: 'Non una conclusione: la consapevolezza che il guardare, ormai, continua da solo.',
    cta: 'Continuo a guardare',
    scenes: [
      { type: 'title', text: 'Ventotto giorni a guardare.' },
      { type: 'thought', text: 'Non hai combattuto il fumo. L’hai osservato.' },
      { type: 'thought', text: 'Il gesto prima del pensiero. La voce che tratta. L’onda che scende da sola.' },
      { type: 'break', text: 'E guardandolo, ha perso presa.' },
      { type: 'notice', text: 'Cosa vedi adesso, nel fumo, che il primo giorno non riuscivi a vedere.' },
    ],
    body: null,
  },
];
