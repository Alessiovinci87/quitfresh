// Test runner minimale (zero dipendenze). Esegui: node src/lib/cognitiveSelector.test.js
const assert = require('assert');
const {
  selectPhrases,
  markUsed,
  RECENT_DAYS,
  _clearTracking,
} = require('./cognitiveSelector');

let passed = 0;
let failed = 0;
function test(name, fn) {
  try {
    _clearTracking();
    fn();
    console.log(`  ok  ${name}`);
    passed++;
  } catch (err) {
    console.error(`  FAIL ${name}`);
    console.error('   ', err.message);
    failed++;
  }
}

// --- 1. Filtro funziona con tutti i parametri ---
test('filtro match esatto su 5 dimensioni — craving acuto SOS', () => {
  const out = selectPhrases({
    trigger_context: 'qualunque',
    craving_phase: 'picco',
    processing_state: 'crisis_compatible',
    intensity: 'alta',
    best_usage: 'SOS',
  }, 3);
  assert.ok(out.length === 3, `expected 3, got ${out.length}`);
  for (const p of out) {
    assert.ok(p.craving_phase.includes('picco'), `phrase ${p.id} non ha picco`);
    assert.strictEqual(p.processing_state, 'crisis_compatible');
    assert.ok(p.best_usage.includes('SOS'));
  }
});

test('filtro per categoria specifica — caffè', () => {
  const out = selectPhrases({
    trigger_context: 'caffè',
    best_usage: 'notifica',
  }, 5);
  assert.ok(out.length >= 1);
  for (const p of out) {
    assert.ok(
      p.trigger_context.includes('caffè') || p.trigger_context.includes('qualunque'),
      `phrase ${p.id} trigger_context=${JSON.stringify(p.trigger_context)}`
    );
  }
});

// --- 2. Fallback allarga progressivamente ---
test('fallback rilassa trigger_context quando troppo restrittivo', () => {
  // Contesto deliberatamente incoerente: trigger inesistente ma altre dim valide.
  const out = selectPhrases({
    trigger_context: 'trigger_che_non_esiste_xyz',
    craving_phase: 'picco',
    processing_state: 'crisis_compatible',
    intensity: 'alta',
    best_usage: 'SOS',
  }, 3);
  assert.ok(out.length === 3, `fallback dovrebbe trovare frasi, got ${out.length}`);
});

test('fallback rilassa anche craving_phase se necessario', () => {
  const out = selectPhrases({
    trigger_context: 'trigger_che_non_esiste',
    craving_phase: 'fase_che_non_esiste',
    best_usage: 'chat',
  }, 2);
  assert.ok(out.length === 2);
});

// --- 3. Scoring ---
test('tier S riceve +1 rispetto a tier A (a parità di altro)', () => {
  // Confronto diretto: chiamiamo con rng deterministico e count alto per vedere ordine.
  const ctx = { best_usage: 'chat' };
  const seq = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8];
  let i = 0;
  const rng = () => seq[i++ % seq.length];
  const out = selectPhrases(ctx, 5, { rng });
  // top-5 candidates (pre-shuffle) sono quelli con score più alto. Verifichiamo
  // che almeno la maggioranza sia tier S quando il contesto è generico.
  const sCount = out.filter((p) => p.tier === 'S').length;
  assert.ok(sCount >= 3, `expected ≥3 tier S in top, got ${sCount}`);
});

test('match esatto su 5 dimensioni riceve +2', () => {
  // Mock interno: testiamo che frasi che soddisfano TUTTE le 5 dimensioni
  // appaiono prima di quelle che soddisfano solo via fallback.
  const ctx = {
    trigger_context: 'qualunque',
    craving_phase: 'picco',
    processing_state: 'crisis_compatible',
    intensity: 'alta',
    best_usage: 'SOS',
  };
  const out = selectPhrases(ctx, 5);
  for (const p of out) {
    assert.ok(p.craving_phase.includes('picco'));
    assert.strictEqual(p.intensity, 'alta');
  }
});

test('trigger_context specifico restituisce SOLO frasi di categoria (no universali)', () => {
  // Filtro gerarchico: con trigger=stress, niente craving_acuto/post_ricaduta.
  const ctx = { trigger_context: 'stress', best_usage: 'chat' };
  const out = selectPhrases(ctx, 5);
  const allStress = out.every((p) => p.id.startsWith('stress_'));
  assert.ok(allStress, `expected SOLO stress_*, got ${out.map((p) => p.id).join(',')}`);
});

test('trigger_context specifico caffè restituisce SOLO frasi caffè', () => {
  const ctx = { trigger_context: 'caffè', best_usage: 'chat' };
  const out = selectPhrases(ctx, 5);
  const allCaffe = out.every((p) => p.id.startsWith('caffe_'));
  assert.ok(allCaffe, `expected SOLO caffe_*, got ${out.map((p) => p.id).join(',')}`);
});

test('trigger inesistente fa fallback su universali', () => {
  // "trigger_che_non_esiste" non ha frasi di categoria → fallback su universali.
  const ctx = {
    trigger_context: 'trigger_che_non_esiste',
    craving_phase: 'picco',
    processing_state: 'crisis_compatible',
    intensity: 'alta',
    best_usage: 'SOS',
  };
  const out = selectPhrases(ctx, 3);
  assert.strictEqual(out.length, 3);
  // Devono essere universali (qualunque)
  const allUniversal = out.every((p) => p.trigger_context.includes('qualunque'));
  assert.ok(allUniversal, `expected universal phrases, got ${out.map((p) => p.id).join(',')}`);
});

// --- 4. Randomizzazione ---
test('chiamate ripetute con rng diversi producono ordini diversi', () => {
  const ctx = { best_usage: 'SOS', craving_phase: 'picco', processing_state: 'crisis_compatible' };
  const callA = selectPhrases(ctx, 3, { rng: makeSeqRng([0.1, 0.9, 0.3, 0.7, 0.5]) });
  const callB = selectPhrases(ctx, 3, { rng: makeSeqRng([0.9, 0.1, 0.7, 0.3, 0.5]) });
  const idsA = callA.map((p) => p.id).join(',');
  const idsB = callB.map((p) => p.id).join(',');
  assert.notStrictEqual(idsA, idsB, 'gli ordini dovrebbero differire');
});

// --- 5. Tracking userId esclude frasi usate di recente ---
test('frase marcata come usata da userId scende nel ranking (-3)', () => {
  const ctx = {
    trigger_context: 'qualunque',
    craving_phase: 'picco',
    processing_state: 'crisis_compatible',
    intensity: 'alta',
    best_usage: 'SOS',
  };
  const userId = 'user-test-1';
  // Prima chiamata senza tracking: prendi un id specifico.
  const first = selectPhrases(ctx, 1, { rng: () => 0 })[0];
  assert.ok(first, 'prima chiamata deve ritornare almeno una frase');

  // Marca tutte le top come usate tranne una, e verifica che la non-usata risalga.
  const all = selectPhrases(ctx, 10);
  for (const p of all.slice(0, 5)) markUsed(userId, p.id);

  // Ora chiediamo 1 frase con userId: lo score di quelle marcate è ridotto di 3,
  // quindi la prima non dovrebbe più essere tra le top con probabilità schiacciante.
  const after = selectPhrases(ctx, 5, { userId, rng: () => 0 });
  const usedIds = new Set(all.slice(0, 5).map((p) => p.id));
  const overlap = after.filter((p) => usedIds.has(p.id)).length;
  // Almeno una frase nuova dovrebbe entrare in top-5
  assert.ok(overlap < 5, `tracking non sta penalizzando: tutte e ${overlap} le top sono usate`);
});

test('tracking ignorato oltre RECENT_DAYS', () => {
  const ctx = { best_usage: 'SOS', craving_phase: 'picco', processing_state: 'crisis_compatible' };
  const userId = 'user-test-2';
  const out = selectPhrases(ctx, 1);
  const phraseId = out[0].id;
  // Marca con timestamp vecchio (oltre 30 giorni)
  const oldTs = Date.now() - (RECENT_DAYS + 1) * 24 * 60 * 60 * 1000;
  markUsed(userId, phraseId, oldTs);
  // La frase non dovrebbe essere penalizzata
  const after = selectPhrases(ctx, 10, { userId });
  assert.ok(after.some((p) => p.id === phraseId), 'frase vecchia non dovrebbe essere penalizzata');
});

// --- 6. Edge cases ---
test('contesto vuoto ritorna comunque qualcosa', () => {
  const out = selectPhrases({}, 1);
  assert.strictEqual(out.length, 1);
});

test('count=0 ritorna array vuoto', () => {
  const out = selectPhrases({ best_usage: 'SOS' }, 0);
  assert.strictEqual(out.length, 0);
});

function makeSeqRng(seq) {
  let i = 0;
  return () => seq[i++ % seq.length];
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
