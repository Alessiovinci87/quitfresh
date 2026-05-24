// Test minimale (zero dipendenze). Esegui: node src/lib/voiceMining.test.js
const assert = require('assert');
const { extractKeywords } = require('./voiceMining');

let passed = 0;
let failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  ok  ${name}`); passed++; }
  catch (err) { console.error(`  FAIL ${name}`); console.error('   ', err.message); failed++; }
}

test('estrae keyword sensate, scarta stop words', () => {
  const kw = extractKeywords('stasera dopo cena ho una voglia pazzesca');
  // "ho", "una" sono stop words; "dopo" no (non in lista) → resta
  assert.ok(kw.includes('stasera'), 'stasera mancante');
  assert.ok(kw.includes('cena'), 'cena mancante');
  assert.ok(kw.includes('voglia'), 'voglia mancante');
  assert.ok(kw.includes('pazzesca'), 'pazzesca mancante');
  assert.ok(!kw.includes('ho'), 'ho non doveva esserci');
  assert.ok(!kw.includes('una'), 'una non doveva esserci');
});

test('lowercase + rimozione punteggiatura', () => {
  const kw = extractKeywords('Sono STRESSATO!! Al lavoro, tantissimo.');
  assert.ok(kw.includes('stressato'), 'stressato mancante');
  assert.ok(kw.includes('lavoro'), 'lavoro mancante');
  assert.ok(kw.includes('tantissimo'), 'tantissimo mancante');
  assert.ok(!kw.includes('sono'), 'sono (stop) non doveva esserci');
});

test('scarta parole < 3 caratteri', () => {
  const kw = extractKeywords('ne ho di più ok va be');
  assert.ok(!kw.some((w) => w.length < 3), `trovata parola corta: ${kw.join(',')}`);
});

test('max 10 keyword + dedup', () => {
  const kw = extractKeywords('caffè caffè caffè sigaretta nervoso mattina pausa ufficio collega riunione stress ansia respiro');
  assert.ok(kw.length <= 10, `troppe keyword: ${kw.length}`);
  assert.strictEqual(kw.filter((w) => w === 'caffè').length, 1, 'caffè non deduplicato');
});

test('input vuoto/non valido → array vuoto', () => {
  assert.deepStrictEqual(extractKeywords(''), []);
  assert.deepStrictEqual(extractKeywords(null), []);
  assert.deepStrictEqual(extractKeywords(undefined), []);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
