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

  const userPrompt = [
    `Ora: ${timeOfDay} (${hour}:00).`,
    `Giorni senza fumo: ${daysSinceQuit}.`,
    `Momenti critici dichiarati dall'utente: ${momenti}.`,
    context ? `Contesto attuale: "${context}".` : null,
  ]
    .filter(Boolean)
    .join(' ');

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'Sei una presenza diretta e umana, non un coach. L\'utente sta avendo un momento di craving. ' +
          'Rispondi in italiano. Non usare frasi motivazionali generiche. ' +
          'Dai esattamente: 1 frase di riconoscimento (max 10 parole), ' +
          '1 azione concreta da fare adesso (fisica o mentale, max 15 parole), ' +
          '1 micro-strategia per i prossimi 5 minuti (max 20 parole). ' +
          'Formato JSON: { "recognition": "...", "action": "...", "strategy": "..." }',
      },
      {
        role: 'user',
        content: userPrompt,
      },
    ],
    max_tokens: 200,
    temperature: 0.7,
  });

  const raw = response.choices[0].message.content;
  return JSON.parse(raw);
}

module.exports = { getCravingResponse };
