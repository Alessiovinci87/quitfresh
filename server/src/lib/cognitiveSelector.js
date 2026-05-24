const library = require('./cognitiveLibrary.json');
const prisma = require('./prisma');

const PHRASES = library.phrases;
const RECENT_DAYS = 30;
const CLEANUP_DAYS = 35;

// Carica i phraseId usati dall'utente negli ultimi RECENT_DAYS come Set.
// Una sola query (no N+1). Best-effort: se il DB fallisce, ritorna Set vuoto
// (peggio: una frase potrebbe ripetersi, mai un crash).
async function loadRecentUsedIds(userId) {
  if (!userId) return new Set();
  try {
    const since = new Date(Date.now() - RECENT_DAYS * 24 * 60 * 60 * 1000);
    const rows = await prisma.cognitivePhraseUsage.findMany({
      where: { userId, usedAt: { gt: since } },
      select: { phraseId: true },
    });
    return new Set(rows.map((r) => r.phraseId));
  } catch (err) {
    console.warn('[cognitiveSelector] loadRecentUsedIds fallita, fallback Set vuoto:', err.message);
    return new Set();
  }
}

// Registra l'uso di una frase. Best-effort: non blocca mai il chiamante.
async function markUsed(userId, phraseId, options = {}) {
  if (!userId || !phraseId) return;
  const { context = null } = options;
  try {
    await prisma.cognitivePhraseUsage.create({
      data: { userId, phraseId, context },
    });
  } catch (err) {
    console.warn('[cognitiveSelector] markUsed fallita (best-effort):', err.message);
  }
}

// Cleanup retention per il cron giornaliero: cancella record oltre CLEANUP_DAYS.
async function cleanupOldUsage(olderThanDays = CLEANUP_DAYS) {
  const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
  const { count } = await prisma.cognitivePhraseUsage.deleteMany({
    where: { usedAt: { lt: cutoff } },
  });
  return count;
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

function _scorePhrase(phrase, ctx, relaxedDimensions, recentUsedIds) {
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
  if (recentUsedIds.has(phrase.id)) score -= 3;
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

// Async: una query upfront per i recenti (o Set iniettato nei test).
async function selectPhrases(context = {}, count = 1, options = {}) {
  const { userId = null, rng = Math.random } = options;
  // recentUsedIds iniettabile per i test (Set). Se assente, query Prisma.
  const recentUsedIds = options.recentUsedIds instanceof Set
    ? options.recentUsedIds
    : await loadRecentUsedIds(userId);

  const { candidates, relaxedDimensions } = _filterWithFallback(context, count);
  if (candidates.length === 0) return [];

  const scored = candidates
    .map((p) => ({ phrase: p, score: _scorePhrase(p, context, relaxedDimensions, recentUsedIds) }))
    .sort((a, b) => b.score - a.score);

  // Randomizza tra le top 5 per evitare output sempre identico.
  const topK = scored.slice(0, Math.max(5, count));
  const shuffled = _shuffle(topK, rng);
  return shuffled.slice(0, count).map((s) => s.phrase);
}

module.exports = {
  selectPhrases,
  markUsed,
  cleanupOldUsage,
  loadRecentUsedIds,
  RECENT_DAYS,
  CLEANUP_DAYS,
};
