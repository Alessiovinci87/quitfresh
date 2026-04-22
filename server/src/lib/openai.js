const OpenAI = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function getTimeOfDay(hour) {
  if (hour >= 5 && hour < 12) return 'mattina';
  if (hour >= 12 && hour < 17) return 'pomeriggio';
  if (hour >= 17 && hour < 21) return 'sera';
  return 'notte';
}

async function getCravingResponse({ user, context }) {
  const now = new Date();
  const hour = now.getHours();
  const timeOfDay = getTimeOfDay(hour);

  const daysSinceQuit = user.quitDate
    ? Math.floor((now - new Date(user.quitDate)) / (1000 * 60 * 60 * 24))
    : 0;

  const momenti = user.criticalMoments?.length
    ? user.criticalMoments.join(', ')
    : 'non specificati';

  const systemPrompt = `Sei un supporto psicologico diretto e umano per una persona che sta smettendo di fumare.
Non sei un coach generico. Sei presente, concreto, parli come un amico intelligente che conosce bene la dipendenza da nicotina.

Regole fondamentali:
- Rispondi SEMPRE in italiano
- Leggi attentamente il contesto e rispondi in modo SPECIFICO a quello che ha scritto, non in modo generico
- Se l'utente ha una domanda, risponderle direttamente con informazioni utili e concrete
- Se parla di farmaci (citisina, vareniclina, NRT, ecc.), supportalo con conoscenza reale su come funzionano e cosa aspettarsi
- Se chiede supporto psicologico, dagliene davvero — empatia concreta, non frasi di circostanza
- NON dare mai consigli banali e scollegati dal contesto (tipo "bevi acqua" quando l'utente sta chiedendo supporto su un farmaco)
- La risposta deve essere proporzionata: se la situazione è semplice, rispondi brevemente; se è complessa o emotiva, approfondisci
- Sii diretto, caldo, onesto. Evita il tono da app di benessere

Formato risposta JSON con questi tre campi:
{
  "recognition": "Mostra che hai capito esattamente cosa sta vivendo — specifica, non generica. Se ha fatto una domanda, inizia ad risponderla qui.",
  "action": "La cosa più utile che può fare ADESSO rispetto alla sua situazione specifica. Può essere un'azione, un pensiero, un'informazione.",
  "strategy": "Un aiuto concreto per le prossime ore o per il percorso — basato sul suo contesto reale, non un consiglio standard."
}`;

  const userPrompt = [
    `Ora del giorno: ${timeOfDay} (${hour}:00).`,
    `Giorni senza fumo: ${daysSinceQuit}.`,
    `Sigarette al giorno prima di smettere: ${user.cigarettesPerDay || 'non specificato'}.`,
    `Livello di dipendenza dichiarato: ${user.dependencyLevel || 'non specificato'}/5.`,
    `Momenti critici dichiarati: ${momenti}.`,
    context
      ? `Messaggio dell'utente: "${context}"`
      : 'L\'utente ha premuto "Ho bisogno ORA" senza aggiungere contesto — probabilmente sta avendo un momento di craving acuto.',
  ].join('\n');

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: 600,
    temperature: 0.75,
  });

  const raw = response.choices[0].message.content;
  return JSON.parse(raw);
}

module.exports = { getCravingResponse };
