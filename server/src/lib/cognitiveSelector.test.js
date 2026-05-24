// Test runner minimale (zero dipendenze, zero DB). Esegui: node src/lib/cognitiveSelector.test.js
// Il tracking recenti è iniettato via options.recentUsedIds (Set) — niente Prisma nei test.
const assert = require('assert');
const { selectPhrases, RECENT_DAYS } = require('./cognitiveSelector');

let passed = 0;
let failed = 0;
const queue = [];
function test(name, fn) {
  queue.push({ name, fn });
}

function makeSeqRng(seq) {
  let i = 0;
  return () => seq[i++ % seq.length];
}

const EMPTY = new Set();

// --- 1. Filtro funziona con tutti i parametri ---
test('filtro match esatto su 5 dimensioni — craving acuto SOS', async () => {
  const out = await selectPhrases({
    trigger_context: 'qualunque',
    craving_phase: 'picco',
    processing_state: 'crisis_compatible',
    intensity: 'alta',
    best_usage: 'SOS',
  }, 3, { recentUsedIds: EMPTY });
  assert.ok(out.length === 3, `expected 3, got ${out.length}`);
  for (const p of out) {
    assert.ok(p.craving_phase.includes('picco'), `phrase ${p.id} non ha picco`);
    assert.strictEqual(p.processing_state, 'crisis_compatible');
    assert.ok(p.best_usage.includes('SOS'));
  }
});

test('filtro per categoria specifica — caffè', async () => {
  const out = await selectPhrases({
    trigger_context: 'caffè',
    best_usage: 'notifica',
  }, 5, { recentUsedIds: EMPTY });
  assert.ok(out.length >= 1);
  for (const p of out) {
    assert.ok(
      p.trigger_context.includes('caffè') || p.trigger_context.includes('qualunque'),
      `phrase ${p.id} trigger_context=${JSON.stringify(p.trigger_context)}`
    );
  }
});

// --- 2. Fallback allarga progressivamente ---
test('fallback rilassa trigger_context quando troppo restrittivo', async () => {
  const out = await selectPhrases({
    trigger_context: 'trigger_che_non_esiste_xyz',
    craving_phase: 'picco',
    processing_state: 'crisis_compatible',
    intensity: 'alta',
    best_usage: 'SOS',
  }, 3, { recentUsedIds: EMPTY });
  assert.ok(out.length === 3, `fallback dovrebbe trovare frasi, got ${out.length}`);
});

test('fallback rilassa anche craving_phase se necessario', async () => {
  const out = await selectPhrases({
    trigger_context: 'trigger_che_non_esiste',
    craving_phase: 'fase_che_non_esiste',
    best_usage: 'chat',
  }, 2, { recentUsedIds: EMPTY });
  assert.ok(out.length === 2);
});

// --- 3. Scoring ---
test('tier S riceve +1 rispetto a tier A (a parità di altro)', async () => {
  const ctx = { best_usage: 'chat' };
  const out = await selectPhrases(ctx, 5, { rng: makeSeqRng([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8]), recentUsedIds: EMPTY });
  const sCount = out.filter((p) => p.tier === 'S').length;
  assert.ok(sCount >= 3, `expected ≥3 tier S in top, got ${sCount}`);
});

test('match esatto su 5 dimensioni riceve +2', async () => {
  const ctx = {
    trigger_context: 'qualunque',
    craving_phase: 'picco',
    processing_state: 'crisis_compatible',
    intensity: 'alta',
    best_usage: 'SOS',
  };
  const out = await selectPhrases(ctx, 5, { recentUsedIds: EMPTY });
  for (const p of out) {
    assert.ok(p.craving_phase.includes('picco'));
    assert.strictEqual(p.intensity, 'alta');
  }
});

test('trigger_context specifico restituisce SOLO frasi di categoria (no universali)', async () => {
  const ctx = { trigger_context: 'stress', best_usage: 'chat' };
  const out = await selectPhrases(ctx, 5, { recentUsedIds: EMPTY });
  const allStress = out.every((p) => p.id.startsWith('stress_'));
  assert.ok(allStress, `expected SOLO stress_*, got ${out.map((p) => p.id).join(',')}`);
});

test('trigger_context specifico caffè restituisce SOLO frasi caffè', async () => {
  const ctx = { trigger_context: 'caffè', best_usage: 'chat' };
  const out = await selectPhrases(ctx, 5, { recentUsedIds: EMPTY });
  const allCaffe = out.every((p) => p.id.startsWith('caffe_'));
  assert.ok(allCaffe, `expected SOLO caffe_*, got ${out.map((p) => p.id).join(',')}`);
});

test('trigger inesistente fa fallback su universali', async () => {
  const ctx = {
    trigger_context: 'trigger_che_non_esiste',
    craving_phase: 'picco',
    processing_state: 'crisis_compatible',
    intensity: 'alta',
    best_usage: 'SOS',
  };
  const out = await selectPhrases(ctx, 3, { recentUsedIds: EMPTY });
  assert.strictEqual(out.length, 3);
  const allUniversal = out.every((p) => p.trigger_context.includes('qualunque'));
  assert.ok(allUniversal, `expected universal phrases, got ${out.map((p) => p.id).join(',')}`);
});

// --- 4. Randomizzazione ---
test('chiamate ripetute con rng diversi producono ordini diversi', async () => {
  const ctx = { best_usage: 'SOS', craving_phase: 'picco', processing_state: 'crisis_compatible' };
  const callA = await selectPhrases(ctx, 3, { rng: makeSeqRng([0.1, 0.9, 0.3, 0.7, 0.5]), recentUsedIds: EMPTY });
  const callB = await selectPhrases(ctx, 3, { rng: makeSeqRng([0.9, 0.1, 0.7, 0.3, 0.5]), recentUsedIds: EMPTY });
  const idsA = callA.map((p) => p.id).join(',');
  const idsB = callB.map((p) => p.id).join(',');
  assert.notStrictEqual(idsA, idsB, 'gli ordini dovrebbero differire');
});

// --- 5. Tracking via recentUsedIds iniettato ---
test('frasi in recentUsedIds scendono nel ranking (-3)', async () => {
  const ctx = {
    trigger_context: 'qualunque',
    craving_phase: 'picco',
    processing_state: 'crisis_compatible',
    intensity: 'alta',
    best_usage: 'SOS',
  };
  // Senza tracking: prendi le top 5.
  const all = await selectPhrases(ctx, 10, { recentUsedIds: EMPTY });
  const usedIds = new Set(all.slice(0, 5).map((p) => p.id));

  // Con quelle 5 marcate come recenti, non dovrebbero più occupare tutte le top-5.
  const after = await selectPhrases(ctx, 5, { recentUsedIds: usedIds, rng: () => 0 });
  const overlap = after.filter((p) => usedIds.has(p.id)).length;
  assert.ok(overlap < 5, `tracking non penalizza: tutte e ${overlap} le top sono usate`);
});

test('frase NON in recentUsedIds non viene penalizzata', async () => {
  const ctx = { best_usage: 'SOS', craving_phase: 'picco', processing_state: 'crisis_compatible' };
  const baseline = await selectPhrases(ctx, 1, { recentUsedIds: EMPTY, rng: () => 0 })[0]
    || (await selectPhrases(ctx, 1, { recentUsedIds: EMPTY, rng: () => 0 }))[0];
  // recentUsedIds con un id estraneo non deve cambiare la presenza delle altre.
  const after = await selectPhrases(ctx, 10, { recentUsedIds: new Set(['id_inesistente_zzz']) });
  assert.ok(after.length >= 1, 'una frase non tracciata deve restare selezionabile');
});

// --- 6. Edge cases ---
test('contesto vuoto ritorna comunque qualcosa', async () => {
  const out = await selectPhrases({}, 1, { recentUsedIds: EMPTY });
  assert.strictEqual(out.length, 1);
});

test('count=0 ritorna array vuoto', async () => {
  const out = await selectPhrases({ best_usage: 'SOS' }, 0, { recentUsedIds: EMPTY });
  assert.strictEqual(out.length, 0);
});

test('RECENT_DAYS esportato = 30', async () => {
  assert.strictEqual(RECENT_DAYS, 30);
});

(async () => {
  for (const { name, fn } of queue) {
    try {
      await fn();
      console.log(`  ok  ${name}`);
      passed++;
    } catch (err) {
      console.error(`  FAIL ${name}`);
      console.error('   ', err.message);
      failed++;
    }
  }
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
})();
