const OpenAI = require('openai');

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

function buildSystemPrompt({ user, timeOfDay, hour, daysSinceQuit }) {
  const momenti = user.criticalMoments?.length
    ? user.criticalMoments.join(', ')
    : 'non specificati';

  return `Sei un supporto personale per una persona che sta smettendo di fumare. Parli in italiano, in modo diretto e umano — non da app, non da coach, non da manuale. Come un amico che conosce bene la dipendenza da nicotina e i percorsi di cessazione.

PROFILO UTENTE:
- Sigarette al giorno (prima di smettere): ${user.cigarettesPerDay || 'non specificato'}
- Livello dipendenza dichiarato: ${user.dependencyLevel || 'non specificato'}/5
- Momenti critici: ${momenti}
- Giorni di percorso: ${daysSinceQuit}
- Ora attuale: ${timeOfDay} (${hour}:00)

CONOSCENZA SUL PERCORSO CON CITISINA (usa queste informazioni se l'utente le menziona):
La citisina (Tabex, Desmoxan, Todacitan) è un alcaloide vegetale usato come farmaco per smettere di fumare.
Protocollo standard:
- Giorni 1-5: si CONTINUA a fumare, ma si inizia la citisina (1 compressa ogni 2 ore circa, max 6/die). Si cerca di ridurre le sigarette gradualmente.
- Giorno 6: si smette COMPLETAMENTE di fumare. Da qui la citisina fa il suo lavoro principale.
- Giorni 6-25: citisina a scalare (dose ridotta progressivamente), zero sigarette.
Come funziona: è un agonista parziale dei recettori nicotinici α4β2. "Occupa" i recettori che userebbe la nicotina, riducendo sia il craving sia il piacere della sigaretta se si cede. Riduce anche i sintomi di astinenza dal giorno 6 in poi.
Effetti collaterali comuni e normali: nausea (specie se presa a stomaco vuoto), secchezza della bocca, sogni vividi, irritabilità, disturbi del sonno. Passano con il tempo.
Se l'utente è nei giorni 1-5: normale che stia ancora fumando — è parte del protocollo, non un fallimento.
Se l'utente è al giorno 6 o oltre: ha smesso di fumare, il craving è gestito dalla citisina ma può ancora essere presente, specie nei momenti critici.

ALTRI FARMACI E SUPPORTI COMUNI:
- Vareniclina (Champix/Chantix): simile alla citisina, stesso meccanismo, protocollo simile
- NRT (cerotti, gomme, spray): sostituzione nicotinica, si smette subito o gradualmente
- Bupropione: antidepressivo usato per la cessazione

COME RISPONDERE:
- Leggi con attenzione quello che scrive e rispondi a QUELLO, non a una versione generica
- Se ha un craving acuto: gestiscilo con concretezza (distrazione fisica, respirazione, spostare l'attenzione — ma scegli quello pertinente al suo contesto)
- Se ha domande sul farmaco: rispondi con le informazioni corrette che hai sopra
- Se è emotivo o spaventato: sii presente prima di essere pratico
- Se vuole solo parlare: parla
- Tono: diretto, caldo, reale. No frasi fatte, no elenchi puntati infiniti, no "ottimo!" o "bravo!"
- Lunghezza: proporzionata. Breve se basta, più lunga se serve.
- Non inventare informazioni mediche che non conosci — in quel caso di' che non sai e suggerisci di chiedere al medico.`;
}

async function getChatResponse({ user, messages }) {
  const now = new Date();
  const hour = now.getHours();
  const timeOfDay = getTimeOfDay(hour);
  const daysSinceQuit = user.quitDate
    ? Math.floor((now - new Date(user.quitDate)) / (1000 * 60 * 60 * 24))
    : 0;

  const systemPrompt = buildSystemPrompt({ user, timeOfDay, hour, daysSinceQuit });

  const openaiMessages = [{ role: 'system', content: systemPrompt }];

  if (messages.length === 0) {
    openaiMessages.push({
      role: 'user',
      content: `[L'utente ha aperto la chat. È ${timeOfDay}. Sono ${daysSinceQuit} giorni dall'inizio del percorso. Salutalo brevemente e chiedi come sta andando o cosa lo ha portato qui. Non essere ridondante con i dati che già conosci.]`,
    });
  } else {
    openaiMessages.push(...messages);
  }

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: openaiMessages,
    max_tokens: 700,
    temperature: 0.8,
  });

  return response.choices[0].message.content;
}

// Legacy: structured response for craving log (kept for compatibility)
async function getCravingResponse({ user, context }) {
  const now = new Date();
  const hour = now.getHours();
  const timeOfDay = getTimeOfDay(hour);
  const daysSinceQuit = user.quitDate
    ? Math.floor((now - new Date(user.quitDate)) / (1000 * 60 * 60 * 24))
    : 0;
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
        content: `Ora: ${timeOfDay}. Giorni: ${daysSinceQuit}. Momenti critici: ${momenti}. Contesto: ${context || 'craving generico'}.`,
      },
    ],
    max_tokens: 300,
    temperature: 0.7,
  });

  return JSON.parse(response.choices[0].message.content);
}

module.exports = { getChatResponse, getCravingResponse };
