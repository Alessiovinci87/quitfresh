const OpenAI = require('openai');
const { getUserProgress } = require('./progress');
const { selectPhrases, markUsed } = require('./cognitiveSelector');

// GDPR: assicurarsi di aver disabilitato "Improve model for everyone" su
// platform.openai.com → Settings → Data Controls, altrimenti i messaggi
// degli utenti (dati sanitari ex art.9 GDPR) finiscono nel training set OpenAI.
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function getTimeOfDay(hour) {
  if (hour >= 5 && hour < 12) return 'mattina';
  if (hour >= 12 && hour < 17) return 'pomeriggio';
  if (hour >= 17 && hour < 21) return 'sera';
  return 'notte';
}

function formatProgress(p) {
  const lines = [`- Giorno del percorso (dal quit date): ${p.daysSinceQuit}`];
  if (p.cytisineDay !== null) {
    lines.push(`- Giorno del protocollo citisina: ${p.cytisineDay}`);
    if (p.cytisinePhase) {
      lines.push(
        `- Fase citisina attiva: ${p.cytisinePhase.pills} compresse/die, intervallo ${p.cytisinePhase.intervalMin}min`
      );
    }
  }
  lines.push(`- Sigarette/giorno pre-quit: ${p.cigarettesPerDay || 'non specificato'}`);
  lines.push(`- Sigarette evitate finora: ${p.cigarettesAvoided}`);
  lines.push(`- Risparmio stimato: €${p.moneySaved.toFixed(2)}`);
  return lines.join('\n');
}

function formatPatterns(ctx) {
  const lines = [];
  lines.push(`- Craving registrati negli ultimi 14 giorni: ${ctx.cravingsLast14d}`);
  lines.push(`- Sessioni SOS completate (totale): ${ctx.cravingsBattled}`);

  if (ctx.topCravingTimes.length > 0) {
    const t = ctx.topCravingTimes.map((x) => `${x.time} (×${x.count})`).join(', ');
    lines.push(`- Orari più frequenti dei craving: ${t}`);
  }
  if (ctx.topCravingBuckets.length > 0) {
    const b = ctx.topCravingBuckets.map((x) => `${x.bucket} (×${x.count})`).join(', ');
    lines.push(`- Fasce della giornata più critiche: ${b}`);
  }
  if (ctx.topTriggers.length > 0) {
    const tg = ctx.topTriggers.map((x) => `${x.trigger} (×${x.count})`).join(', ');
    lines.push(`- Trigger ricorrenti citati nei log: ${tg}`);
  }
  if (ctx.diarySummary.length > 0) {
    lines.push('- Diario recente:');
    for (const d of ctx.diarySummary) {
      const se = d.sideEffects.length ? ` effetti:${d.sideEffects.join('/')}` : '';
      const note = d.notes ? ` note:"${d.notes}"` : '';
      lines.push(`    · ${d.date} — capsule:${d.pills} sig:${d.cigs}${se}${note}`);
    }
  }
  return lines.length ? lines.join('\n') : '- Nessun pattern significativo ancora registrato.';
}

// Registri di risposta: forzano variabilità di formato. Probabilità uguale.
const REGISTERS = {
  SECCO: `REGISTRO PER QUESTA RISPOSTA: secco.
Massimo 2 frasi totali. Niente apertura empatica. Niente "capisco", "so quanto", "è normale". Vai dritto al punto cognitivo. Nessuna domanda finale.`,

  DOMANDA_SOLA: `REGISTRO PER QUESTA RISPOSTA: domanda sola.
La tua risposta deve essere UNA sola domanda lucida che sposta l'attenzione dell'utente verso un dettaglio specifico del suo stato. Niente preambolo. Niente spiegazione. Solo la domanda.

VARIAZIONE OBBLIGATORIA:
NON iniziare la domanda con:
- "cosa stai..."
- "come ti senti..."
- "cosa pensi di..."

Varia angolazione, scegliendo tra:
- Dettaglio concreto: "da quanto tempo non ti fermi?"
- Ambiente: "sei in macchina? in pausa? a casa?"
- Timing: "è successo qualcosa nell'ultima ora?"
- Corpo: "dove lo senti, nel corpo?"
- Trigger specifico: "qualcuno intorno sta fumando?"
- Situazione: "cosa stavi facendo proprio prima?"

La domanda deve essere SPECIFICA e CONCRETA, mai generica.`,

  OSSERVAZIONE_BREVE: `REGISTRO PER QUESTA RISPOSTA: osservazione breve.
REGOLE FERREE NON NEGOZIABILI:
- MASSIMO 1 frase (una sola, no eccezioni)
- MASSIMO 20 parole
- VIETATO concludere con:
  * insegnamenti ("è importante...", "il primo passo...")
  * interpretazioni ("questo significa che...")
  * inviti riflessivi ("prenditi un momento per...")
  * mindfulness AI ("riconoscere il ciclo...")
  * consigli impliciti ("puoi provare a...")
  * morale ("ricorda che...")

La frase deve OSSERVARE un fatto cognitivo, punto. Nessuna chiusura, nessun bow tie, nessun coaching.

Esempi VALIDI:
- "lo stress sta cercando un'interruzione, non una soluzione."
- "questo momento è più intenso che pericoloso."
- "la sigaretta non chiude il bisogno, lo rimanda."

Esempi NON validi (NON fare così):
- "questo è importante da riconoscere."
- "il primo passo è notare il pattern."
- "prenditi un momento per osservare."`,

  CONVERSAZIONALE_ASCIUTTO: `REGISTRO PER QUESTA RISPOSTA: conversazionale asciutto.
2-3 frasi brevi, senza apertura empatica formulaica. Niente "capisco". Puoi finire con una domanda OPPURE con uno statement, scegli quello che suona più naturale.`,

  RICONOSCIMENTO_E_SPAZIO: `REGISTRO PER QUESTA RISPOSTA: riconoscimento e spazio.
1 frase che riconosce il momento + 1 frase che smonta una illusione. Stop. Niente domanda. Niente coaching. Lascia spazio.`,
};

const REGISTER_KEYS = Object.keys(REGISTERS);

function pickRegister(rng = Math.random) {
  const i = Math.floor(rng() * REGISTER_KEYS.length);
  return REGISTER_KEYS[i];
}

function buildRegisterBlock(key) {
  const body = REGISTERS[key] || REGISTERS.CONVERSAZIONALE_ASCIUTTO;
  return `${body}

REGOLE COMUNI A TUTTI I REGISTRI:
- Mai citare le frasi del framework alla lettera
- Mai aprire con "Capisco" a meno che il registro non lo permetta esplicitamente
- Mai chiudere ogni risposta con "sono qui per te" o simili
- Massimo 4 frasi totali in QUALSIASI registro`;
}

// Inferisce le 5 dimensioni del context cognitivo dal testo del messaggio utente
// + segnali esistenti (trigger, recentSos, ora). Volutamente semplice: keyword
// matching su lemmi italiani. Il selettore poi applica fallback se troppo stretto.
function inferCognitiveContext({ userMessage = '', ctx = {}, hour = null }) {
  const t = (userMessage || '').toLowerCase();
  const out = { best_usage: 'chat' };

  // craving_phase + intensity + processing_state
  if (/\b(ho fumato|sono tornato a fumare|ho ceduto|ho ripreso|ricaduta|ricaduto|fumata|appena fumat)/.test(t)) {
    out.craving_phase = 'post-ricaduta';
    out.processing_state = 'crisis_compatible';
    out.intensity = 'alta';
  } else if (/\b(voglio fumare|sto per cedere|non resisto|non ce la faccio|sto cedendo|crollare|esplodere|impazzir)/.test(t)) {
    out.craving_phase = 'picco';
    out.processing_state = 'crisis_compatible';
    out.intensity = 'alta';
  } else if (/\b(craving|voglia|tentazione|mi sale|mi viene voglia|tira)/.test(t)) {
    out.craving_phase = 'anticipazione';
    out.intensity = 'media';
  }

  // trigger_context (priorità: SOS appena fatto → testo → ora del giorno)
  if (ctx.recentSos) {
    out.craving_phase = out.craving_phase || 'post-picco';
  }
  if (/\b(caff[èe])/.test(t)) out.trigger_context = 'caffè';
  else if (/\b(dopo cena|cenato|cena)/.test(t)) out.trigger_context = 'dopo cena';
  else if (/\b(dopo pranzo|pranzato|pranzo)/.test(t)) out.trigger_context = 'dopo pranzo';
  else if (/\b(stress|stressato|stressata|nervoso|nervosa|teso|tesa|giornata pesante|esaurit|esausto|esausta)/.test(t)) out.trigger_context = 'stress';
  else if (/\b(noia|annoiato|annoiata|vuoto|non so cosa|nulla da fare)/.test(t)) out.trigger_context = 'noia';
  else if (/\b(guida|in macchina|in auto|guidare)/.test(t)) out.trigger_context = 'guida';
  else if (/\b(amici|in compagnia|festa|aperitivo|gruppo)/.test(t)) out.trigger_context = 'socialità';
  else if (/\b(svegli|appena alzat|mattina|colazione)/.test(t)) out.trigger_context = 'mattino';
  else if (/\b(non riesco a dormire|notte|tardi|insonnia)/.test(t)) out.trigger_context = 'sera tardi';
  else if (/\b(domenica sera|domani lavoro|domani lunedì|domani lunedi)/.test(t)) out.trigger_context = 'domenica sera';
  else if (hour !== null) {
    // Fallback orario: copre i contesti più frequenti senza forzare match testuali.
    if (hour >= 6 && hour < 10) out.trigger_context = 'mattino';
    else if (hour >= 15 && hour < 17) out.trigger_context = 'pausa lavoro';
    else if (hour >= 21 && hour < 24) out.trigger_context = 'dopo cena';
    else if (hour >= 0 && hour < 3) out.trigger_context = 'sera tardi';
  }

  return out;
}

function buildCognitiveFramework(phrases) {
  if (!phrases || phrases.length === 0) return '';

  const uniq = (arr) => [...new Set(arr)].slice(0, 6);
  const emotional = uniq(phrases.flatMap((p) => p.emotional_state || []));
  const patterns = uniq(phrases.flatMap((p) => p.cognitive_pattern || []));
  const effects = uniq(phrases.flatMap((p) => p.mental_effect || []));
  const energy = uniq(phrases.flatMap((p) => p.response_energy || []));
  const tones = uniq(phrases.flatMap((p) => p.tone || []));

  return `FRAMEWORK COGNITIVO PER QUESTA RISPOSTA (uso interno, NON citare letteralmente):
- Stato interno probabile dell'utente: ${emotional.join(', ') || 'non specificato'}
- Pattern cognitivi da smontare con delicatezza: ${patterns.join(', ') || 'non specificato'}
- Effetto da produrre nella sua mente: ${effects.join(', ') || 'non specificato'}
- Energia della risposta: ${energy.join(', ') || 'grounding'}
- Tono complessivo: ${tones.join(', ') || 'lucido, molto umano'}

REGOLA DI PRIORITÀ ASSOLUTA:
Il framework cognitivo qui sopra HA PRIORITÀ SU TUTTE LE ALTRE REGOLE.
La tua risposta DEVE smontare almeno uno dei pattern cognitivi indicati nel framework.
Le altre regole (usa un dato, fai una domanda, etc.) sono SECONDARIE e si applicano solo dopo aver soddisfatto questa.

ESEMPI DI COSA FARE:
- Pattern "separa impulso da azione" → osservazione che separi il desiderio dal comportamento obbligato. NON "pensa a quanto hai risparmiato".
- Pattern "amplificazione percettiva" → ridimensiona la sensazione attuale come prodotto del cervello, non come verità. NON "è normale sentirsi così".
- Pattern "tutto-o-niente post-ricaduta" / "fusione episodio-identità" → separa l'evento dall'identità di fumatore. NON "capita a tutti, riprova".
- Pattern "confusione interruzione-soluzione" (stress) → distingui il bisogno di pausa dal bisogno di nicotina. NON "lo stress è dura, respira".

ESEMPI DI COSA NON FARE:
- Citare risparmio economico come motivazione
- Dire "capisco" seguito da empatia generica
- Fare domande senza prima offrire un'osservazione lucida
- Riempire la risposta con dati invece di smontare illusioni

VARIABILITÀ DI REGISTRO:
La tua risposta NON deve sempre avere la stessa struttura. Varia in modo umano:
- A volte: 1 sola frase, secca, che chiude. Es: "okay. questo momento sembra enorme perché lo è, adesso."
- A volte: solo una domanda lucida. Es: "cosa è successo nei minuti prima?"
- A volte: 2-3 frasi brevi, senza domanda finale.
- A volte: una frase + spazio. Niente coaching, niente "sono qui per te".

REGOLE ANTI-FORMAT:
- NON aprire ogni risposta con "Capisco"
- NON chiudere ogni risposta con una domanda
- NON sempre offrire dati concreti (risparmio, giorni, sigarette evitate) — usali SOLO quando l'utente li chiede o quando sono davvero pertinenti
- A volte la cosa giusta da dire è poco
- Il silenzio non è assenza, è presenza calma

ESEMPI DI RISPOSTE BREVI VALIDE:
- "okay."
- "cosa stai notando nel corpo adesso?"
- "questo momento è più intenso che pericoloso."
- "aspetta. respira. non c'è fretta di decidere niente."
- "è successo. e adesso?"

NON forzare la varietà — fai emergere quando è giusto.

REGOLE TECNICHE DI FORMATO:
- NON citare frasi pre-scritte o aforismi
- Riformula i concetti del framework con parole tue, conversazionali
- Frasi brevi, naturali, mai sentenziose
- Massimo 3-4 frasi per risposta
- Quando appropriato, lascia spazio al silenzio invece di riempire`;
}

function buildSystemPrompt({ user, timeOfDay, hour, context, cognitiveFramework = '', registerBlock = '' }) {
  const momenti = user.criticalMoments?.length
    ? user.criticalMoments.join(', ')
    : 'non specificati';
  const motivi = user.quitReasons?.length
    ? user.quitReasons.join(', ')
    : 'non specificati';

  return `${registerBlock}

Sei un supporto personale per una persona che sta smettendo di fumare. Parli in italiano, in modo diretto e umano — non da app, non da coach, non da manuale. Come un amico che conosce bene la dipendenza da nicotina e i percorsi di cessazione.

${cognitiveFramework}

PROFILO DICHIARATO IN ONBOARDING (informazioni di contesto storico, NON eventi appena successi — non assumere che siano rilevanti al messaggio attuale a meno che l'utente non li menzioni)
- Livello dipendenza: ${user.dependencyLevel || 'non specificato'}/5
- Momenti critici tipici dichiarati nel profilo: ${momenti}
- Motivi per smettere dichiarati nel profilo: ${motivi}

STATO ATTUALE (dati live, calcolati ora)
${formatProgress(context.progress)}
- Ora locale: ${timeOfDay} (${hour}:00)

PATTERN OSSERVATI
${formatPatterns(context)}

CONOSCENZA PROTOCOLLO CITISINA (usa solo se pertinente)
Citisina (Tabex/Desmoxan/Todacitan): alcaloide vegetale, agonista parziale dei recettori nicotinici α4β2.
- Giorni 1-5: si continua a fumare riducendo gradualmente, si inizia la citisina.
- Giorno 6: si smette completamente di fumare.
- Giorni 6-25: dose a scalare, zero sigarette.
Effetti collaterali comuni: nausea, secchezza, sogni vividi, irritabilità, sonno disturbato.
Altri supporti: vareniclina (Champix), NRT (cerotti/gomme), bupropione.

REGOLE DI RISPOSTA SECONDARIE (si applicano DOPO aver soddisfatto il framework cognitivo in cima)
1. Usa SEMPRE almeno un dato concreto dello "STATO ATTUALE" o dei "PATTERN OSSERVATI". Se citi un numero, deve venire da lì — mai inventato. NON inventare contesti dal "PROFILO DICHIARATO IN ONBOARDING" (es. non dire "il caffè" o "la pausa" se l'utente non l'ha menzionato adesso).
2. Se l'utente segnala un craving e l'orario/contesto matcha un pattern, riconoscilo esplicitamente (es: "è il momento dopo pranzo, ti succede spesso").
3. VIETATO: frasi motivazionali generiche ("Sei forte", "Ce la farai", "Bravo", "Sei sulla strada giusta"), inviti generici a "respirare profondamente" senza contesto, elenchi puntati lunghi, emoji.
4. VIETATO: ripetere frasi o aperture già usate nella tua risposta precedente di questa conversazione. Varia.
5. Lunghezza: massimo 3 frasi, a meno che l'utente chieda esplicitamente una spiegazione tecnica.
6. Se non hai abbastanza dati per essere specifico, fai UNA domanda concreta (orario, situazione fisica, ultimo pasto, dove ti trovi) invece di rispondere generico.
7. Non inventare informazioni mediche. Se non sai, dillo e suggerisci il medico.
8. Tono: diretto, caldo, reale. Mai paternalismo.`;
}

async function getChatResponse({ user, messages, context }) {
  const now = new Date();
  const hour = now.getHours();
  const timeOfDay = getTimeOfDay(hour);

  // Fallback: se chi chiama non ha passato context (es. test), lo costruiamo
  // qui in modo minimale dal solo user (no query DB aggiuntive).
  const ctx = context || {
    progress: getUserProgress(user, now),
    cravingsBattled: 0,
    cravingsLast14d: 0,
    topCravingTimes: [],
    topCravingBuckets: [],
    topTriggers: [],
    diarySummary: [],
  };

  // Libreria cognitiva: seleziona 3 frasi pertinenti come framework invisibile.
  // Le frasi NON vengono mostrate all'utente: orientano solo il ragionamento AI.
  const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');
  const cognitiveContext = inferCognitiveContext({
    userMessage: lastUserMessage?.content || '',
    ctx,
    hour,
  });
  const selectedPhrases = await selectPhrases(cognitiveContext, 3, { userId: user.id });
  const cognitiveFramework = buildCognitiveFramework(selectedPhrases);
  const registerKey = pickRegister();
  const registerBlock = buildRegisterBlock(registerKey);
  console.log(`[cognitive] register=${registerKey} phrases=${selectedPhrases.map((p) => p.id).join(',')}`);

  const systemPrompt = buildSystemPrompt({ user, timeOfDay, hour, context: ctx, cognitiveFramework, registerBlock });

  const openaiMessages = [{ role: 'system', content: systemPrompt }];

  if (messages.length === 0) {
    // Bootstrap: saluto contestuale. Adattiamo il prompt-stub in base a:
    // - trigger di apertura (sos / welcome)
    // - sessione SOS appena conclusa (<5min)
    // - prima chat del giorno o conversazione continuata
    let hint;
    if (ctx.trigger === 'sos' || ctx.recentSos) {
      const sosInfo = ctx.recentSos
        ? ` (intensita' prima: ${ctx.recentSos.intensityBefore}/10, dopo: ${ctx.recentSos.intensityAfter ?? 'n.d.'}/10, azione: ${ctx.recentSos.type})`
        : '';
      hint = `[L'utente ha appena usato SOS Craving${sosInfo} e ora ha aperto la chat. Chiedi come sta ADESSO, brevemente, senza ripetere i numeri. 1 frase.]`;
    } else if (ctx.trigger === 'welcome') {
      hint = `[Primo accesso post-onboarding. Saluta caldo (1 frase) e proponi di provare insieme un primo craving simulato per capire come funziona il supporto. Non elencare feature.]`;
    } else if (ctx.isFirstChatToday) {
      hint = `[Prima chat del giorno. È ${timeOfDay}, giorno ${ctx.progress.daysSinceQuit} del percorso. Saluto breve (1 frase) + 1 domanda concreta sul momento.]`;
    } else {
      hint = `[L'utente ha riaperto la chat oggi. È ${timeOfDay}. Niente saluto formale, riprendi col tono di una conversazione gia' in corso. 1 frase + domanda.]`;
    }
    openaiMessages.push({ role: 'user', content: hint });
  } else {
    // Cap a ultimi 10 messaggi: costo token altrimenti quadratico nella
    // lunghezza chat. Il contesto persistente (progressi, pattern, citisina)
    // è già nel system prompt ricostruito da DB ad ogni turno.
    openaiMessages.push(...messages.slice(-10));
  }

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: openaiMessages,
    max_tokens: 500,
    temperature: 0.7,
    presence_penalty: 0.5,
    frequency_penalty: 0.6,
  });

  // Tracking: marca le frasi usate (fire-and-forget, best-effort). La risposta
  // è già pronta — un errore di tracking non deve mai rompere la chat.
  for (const p of selectedPhrases) {
    markUsed(user.id, p.id, { context: 'chat' }).catch(() => {});
  }

  return response.choices[0].message.content;
}

// Legacy: structured response for craving log (kept for compatibility)
async function getCravingResponse({ user, context }) {
  const now = new Date();
  const hour = now.getHours();
  const timeOfDay = getTimeOfDay(hour);
  const progress = getUserProgress(user, now);
  const momenti = user.criticalMoments?.length ? user.criticalMoments.join(', ') : 'non specificati';

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `Supporto per cessazione tabagica. Rispondi in italiano. JSON: { "recognition": "...", "action": "...", "strategy": "..." }`,
      },
      {
        role: 'user',
        content: `Ora: ${timeOfDay}. Giorni: ${progress.daysSinceQuit}. Momenti critici: ${momenti}. Contesto: ${context || 'craving generico'}.`,
      },
    ],
    max_tokens: 300,
    temperature: 0.7,
  });

  return JSON.parse(response.choices[0].message.content);
}

module.exports = {
  getChatResponse,
  getCravingResponse,
  buildSystemPrompt,
  inferCognitiveContext,
  buildCognitiveFramework,
  pickRegister,
  REGISTERS,
};
