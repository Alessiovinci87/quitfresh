const OpenAI = require('openai');
const { getUserProgress } = require('./progress');

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

function buildSystemPrompt({ user, timeOfDay, hour, context }) {
  const momenti = user.criticalMoments?.length
    ? user.criticalMoments.join(', ')
    : 'non specificati';
  const motivi = user.quitReasons?.length
    ? user.quitReasons.join(', ')
    : 'non specificati';

  return `Sei un supporto personale per una persona che sta smettendo di fumare. Parli in italiano, in modo diretto e umano — non da app, non da coach, non da manuale. Come un amico che conosce bene la dipendenza da nicotina e i percorsi di cessazione.

PROFILO DICHIARATO
- Livello dipendenza: ${user.dependencyLevel || 'non specificato'}/5
- Momenti critici dichiarati: ${momenti}
- Motivi per smettere: ${motivi}

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

REGOLE DI RISPOSTA (rispettarle sempre)
1. Usa SEMPRE almeno un dato concreto dello "STATO ATTUALE" o dei "PATTERN OSSERVATI". Se citi un numero, deve venire da lì — mai inventato.
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

  const systemPrompt = buildSystemPrompt({ user, timeOfDay, hour, context: ctx });

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
    temperature: 0.85,
    presence_penalty: 0.6,
    frequency_penalty: 0.4,
  });

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

module.exports = { getChatResponse, getCravingResponse, buildSystemPrompt };
