// Test live integrazione libreria cognitiva → chat OpenAI.
// Esegui da server/: node scripts/testCognitiveChat.js
// Richiede OPENAI_API_KEY in .env del server o nell'ambiente.

require('dotenv').config();

if (!process.env.OPENAI_API_KEY) {
  console.error('ERRORE: OPENAI_API_KEY non trovata. Crea server/.env con OPENAI_API_KEY=... oppure passa inline.');
  process.exit(1);
}

const { getChatResponse, inferCognitiveContext, buildCognitiveFramework } = require('../src/lib/openai');
const { selectPhrases, _clearTracking } = require('../src/lib/cognitiveSelector');

// Mock user minimale (campi usati da buildSystemPrompt + getUserProgress).
// Niente DB: passiamo un context pre-costruito per saltare le query.
const mockUser = {
  id: 'test-cognitive-' + Date.now(),
  email: 'test@cognitivelib.local',
  dependencyLevel: 4,
  criticalMoments: ['dopo il caffè', 'pausa lavoro', 'dopo cena'],
  quitReasons: ['salute', 'soldi'],
  cigarettesPerDay: 15,
  quitDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 giorni fa
  cytisineStartDate: null,
};

const mockContext = {
  progress: {
    daysSinceQuit: 5,
    cytisineDay: null,
    cytisinePhase: null,
    cigarettesPerDay: 15,
    cigarettesAvoided: 75,
    moneySaved: 37.5,
  },
  cravingsBattled: 8,
  cravingsLast14d: 12,
  topCravingTimes: [{ time: '16:00', count: 4 }, { time: '21:00', count: 3 }],
  topCravingBuckets: [{ bucket: 'pomeriggio', count: 7 }],
  topTriggers: [{ trigger: 'stress', count: 5 }, { trigger: 'caffè', count: 3 }],
  diarySummary: [],
};

const scenarios = [
  { label: 'CRAVING ACUTO', message: 'voglio fumare' },
  { label: 'POST-RICADUTA', message: 'ho appena fumato una sigaretta' },
  { label: 'STRESS GENERICO', message: 'sono stressato' },
];

function normalize(s) {
  return s.toLowerCase().replace(/\s+/g, ' ').trim();
}

async function runOne({ label, message }) {
  _clearTracking();
  const hour = new Date().getHours();

  // Step 1: stampa contesto inferito + frasi selezionate + framework
  const ctx = inferCognitiveContext({ userMessage: message, ctx: mockContext, hour });
  const selected = selectPhrases(ctx, 3, { userId: mockUser.id });
  const framework = buildCognitiveFramework(selected);

  console.log('\n' + '='.repeat(70));
  console.log(`SCENARIO: ${label}`);
  console.log(`MESSAGGIO UTENTE: "${message}"  (ora ${hour})`);
  console.log('-'.repeat(70));
  console.log('CONTEXT INFERITO:', JSON.stringify(ctx));
  console.log('FRASI SELEZIONATE (NON devono apparire nella risposta):');
  selected.forEach((p, i) => console.log(`  ${i + 1}. [${p.id}] ${p.text}`));
  console.log('\nFRAMEWORK INIETTATO:');
  console.log(framework.split('\n').map((l) => '  ' + l).join('\n'));

  // Step 2: chiamata reale a OpenAI
  console.log('\n→ Chiamata OpenAI in corso...');
  let response;
  try {
    response = await getChatResponse({
      user: mockUser,
      messages: [{ role: 'user', content: message }],
      context: mockContext,
    });
  } catch (err) {
    console.error('ERRORE OpenAI:', err.message);
    return;
  }

  console.log('\nRISPOSTA AI:');
  console.log('  "' + response + '"');

  // Step 3: verifica anti-citazione
  const normalizedResponse = normalize(response);
  const leaks = [];
  for (const p of selected) {
    if (normalizedResponse.includes(normalize(p.text))) {
      leaks.push(p.id);
    }
    // Check anche su sotto-stringhe significative (prime 8 parole consecutive)
    const words = p.text.split(/\s+/);
    if (words.length >= 8) {
      const chunk = normalize(words.slice(0, 8).join(' '));
      if (normalizedResponse.includes(chunk) && !leaks.includes(p.id)) {
        leaks.push(p.id + ' (chunk match)');
      }
    }
  }
  console.log('\nANTI-CITAZIONE CHECK:');
  if (leaks.length === 0) {
    console.log('  ✓ Nessuna frase citata letteralmente');
  } else {
    console.log('  ✗ LEAK rilevati:', leaks.join(', '));
  }
}

(async () => {
  const RUNS_PER_SCENARIO = 3;
  for (const s of scenarios) {
    for (let i = 1; i <= RUNS_PER_SCENARIO; i++) {
      await runOne({ ...s, label: `${s.label} — run ${i}/${RUNS_PER_SCENARIO}` });
    }
  }
  console.log('\n' + '='.repeat(70));
  console.log('FINE TEST.');
})();
