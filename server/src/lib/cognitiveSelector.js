const library = require('./cognitiveLibrary.json');

const PHRASES = library.phrases;
const RECENT_DAYS = 30;
const RECENT_MS = RECENT_DAYS * 24 * 60 * 60 * 1000;

// In-memory tracking: Map<userId, Map<phraseId, timestampMs>>
// Sostituibile in futuro con storage Prisma. Esposto via _store per test.
const _store = new Map();

function _now() {
  return Date.now();
}

function _isUsedRecently(userId, phraseId, now = _now()) {
  if (!userId) return false;
  const userMap = _store.get(userId);
  if (!userMap) return false;
  const ts = userMap.get(phraseId);
  if (!ts) return false;
  return now - ts < RECENT_MS;
}

function markUsed(userId, phraseId, ts = _now()) {
  if (!userId || !phraseId) return;
  let userMap = _store.get(userId);
  if (!userMap) {
    userMap = new Map();
    _store.set(userId, userMap);
  }
  userMap.set(phraseId, ts);
}

function _clearTracking() {
  _store.clear();
}

// Match esatto su singola dimensione, con supporto per "qualunque" / "any"
// nei campi della frase (universalità).
function _matchesDimension(phraseValue, ctxValue, universalTokens = []) {
  if (ctxValue === undefined || ctxValue === null) return true; // dimensione non specificata
  if (Array.isArray(phraseValue)) {
    if (universalTokens.some((u) => phraseValue.includes(u))) return true;
    return phraseValue.includes(ctxValue);
  }
  if (universalTokens.includes(phraseValue)) return true;
  return phraseValue === ctxValue;
}

function _matchAll(phrase, ctx) {
  return (
    _matchesDimension(phrase.trigger_context, ctx.trigger_context, ['qualunque']) &&
    _matchesDimension(phrase.craving_phase, ctx.craving_phase) &&
    _matchesDimension(phrase.processing_state, ctx.processing_state) &&
    _matchesDimension(phrase.intensity, ctx.intensity) &&
    _matchesDimension(phrase.best_usage, ctx.best_usage)
  );
}

// Variante di _matchAll che NON tratta "qualunque" come jolly per trigger_context.
// Serve per il filtro gerarchico: se l'utente è in un trigger specifico (stress,
// caffè, guida...), le frasi universali non valgono — vogliamo solo quelle della
// categoria esatta.
function _matchAllStrictTrigger(phrase, ctx) {
  const triggerOk = Array.isArray(phrase.trigger_context)
    && phrase.trigger_context.includes(ctx.trigger_context);
  return (
    triggerOk &&
    _matchesDimension(phrase.craving_phase, ctx.craving_phase) &&
    _matchesDimension(phrase.processing_state, ctx.processing_state) &&
    _matchesDimension(phrase.intensity, ctx.intensity) &&
    _matchesDimension(phrase.best_usage, ctx.best_usage)
  );
}

// Selezione gerarchica:
// 1. Se ctx ha trigger_context specifico ed esistono frasi di quella categoria
//    (match esatto, NO "qualunque"), restituisci SOLO quelle. Anche se <count.
// 2. Altrimenti, filtro normale + fallback progressivo.
function _filterWithFallback(ctx, count) {
  if (ctx.trigger_context && ctx.trigger_context !== 'qualunque') {
    const strict = PHRASES.filter((p) => _matchAllStrictTrigger(p, ctx));
    if (strict.length > 0) return { candidates: strict, relaxedDimensions: [] };
    // Se la categoria specifica non ha match coi vincoli, rilassa SOLO le altre
    // dim tenendo il trigger stretto.
    const strictTriggerOnly = PHRASES.filter(
      (p) => Array.isArray(p.trigger_context) && p.trigger_context.includes(ctx.trigger_context)
    );
    if (strictTriggerOnly.length > 0) return { candidates: strictTriggerOnly, relaxedDimensions: ['other'] };
    // Nessuna frase di categoria → fallback su craving_acuto/post_ricaduta universali.
  }

  let candidates = PHRASES.filter((p) => _matchAll(p, ctx));
  if (candidates.length >= count) return { candidates, relaxedDimensions: [] };

  const relaxed1 = { ...ctx, trigger_context: undefined };
  candidates = PHRASES.filter((p) => _matchAll(p, relaxed1));
  if (candidates.length >= count) return { candidates, relaxedDimensions: ['trigger_context'] };

  const relaxed2 = { ...relaxed1, craving_phase: undefined };
  candidates = PHRASES.filter((p) => _matchAll(p, relaxed2));
  return { candidates, relaxedDimensions: ['trigger_context', 'craving_phase'] };
}

function _scorePhrase(phrase, ctx, userId, relaxedDimensions, now) {
  let score = 0;
  // +2 se match esatto su TUTTE e 5 le dimensioni (nessun fallback applicato).
  if (relaxedDimensions.length === 0 && _matchAll(phrase, ctx)) {
    score += 2;
  }
  // Bonus per trigger_context specifico: privilegia frasi della categoria
  // esatta rispetto alle universali ("qualunque") quando il ctx è chiaro.
  if (
    ctx.trigger_context &&
    ctx.trigger_context !== 'qualunque' &&
    Array.isArray(phrase.trigger_context) &&
    phrase.trigger_context.includes(ctx.trigger_context)
  ) {
    score += 2;
  }
  if (phrase.tier === 'S') score += 1;
  if (_isUsedRecently(userId, phrase.id, now)) score -= 3;
  return score;
}

// Fisher-Yates parziale (basta per top-K piccolo).
function _shuffle(arr, rng = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function selectPhrases(context = {}, count = 1, options = {}) {
  const { userId = null, rng = Math.random, now = _now() } = options;
  const { candidates, relaxedDimensions } = _filterWithFallback(context, count);
  if (candidates.length === 0) return [];

  const scored = candidates
    .map((p) => ({ phrase: p, score: _scorePhrase(p, context, userId, relaxedDimensions, now) }))
    .sort((a, b) => b.score - a.score);

  // Randomizza tra le top 5 per evitare output sempre identico.
  const topK = scored.slice(0, Math.max(5, count));
  const shuffled = _shuffle(topK, rng);
  return shuffled.slice(0, count).map((s) => s.phrase);
}

module.exports = {
  selectPhrases,
  markUsed,
  RECENT_DAYS,
  _store,
  _clearTracking,
};
