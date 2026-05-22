// Telemetria di prodotto: ricezione batch eventi dal client.
// Endpoint pubblico (autenticato opzionale): se l'utente è loggato
// associamo userId, altrimenti registriamo anonymously (es. landing).
const router = require('express').Router();
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

// Whitelist di tipi accettati. Bloccare tipi arbitrari evita pollution
// della tabella se il client viene compromesso o un attacker spamma.
const ALLOWED_TYPES = new Set([
  'app_open',
  'page_view',
  'onboarding_started',
  'onboarding_step',
  'onboarding_completed',
  'sos_started',
  'sos_step',
  'sos_completed',
  'sos_abandoned',
  'chat_message_sent',
  'chat_limit_hit',
  'diary_entry_saved',
  'craving_logged',
  'paywall_seen',
  'paywall_cta_clicked',
  'checkout_started',
  'promo_code_entered',
  'notification_clicked',
  'stats_viewed',
  'tools_viewed',
  'profile_viewed',
  'login_success',
  'register_success',
]);

const MAX_EVENTS_PER_BATCH = 50;
const MAX_META_BYTES = 2000;

// Auth opzionale: legge il JWT se presente per associare userId, ma
// non rifiuta la richiesta se manca/scaduto — gli eventi anonimi sono validi.
function softAuth(req, _res, next) {
  const h = req.headers.authorization;
  if (!h || !h.startsWith('Bearer ')) return next();
  try {
    const payload = jwt.verify(h.slice(7), process.env.JWT_SECRET);
    req.userId = payload.userId;
  } catch {
    // token invalido → ignora, traccia come anonymous
  }
  next();
}

// POST /api/events  body: { events: [{type, path?, meta?}] }
router.post('/', softAuth, async (req, res) => {
  const { events } = req.body || {};
  if (!Array.isArray(events) || events.length === 0) {
    return res.status(400).json({ error: 'events array richiesto' });
  }
  if (events.length > MAX_EVENTS_PER_BATCH) {
    return res.status(400).json({ error: `Max ${MAX_EVENTS_PER_BATCH} eventi per batch` });
  }

  // Opt-out check: utenti loggati che hanno disattivato la telemetria.
  if (req.userId) {
    const u = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { analyticsOptOut: true },
    }).catch(() => null);
    if (u?.analyticsOptOut) return res.json({ accepted: 0, optOut: true });
  }

  const rows = [];
  for (const e of events) {
    if (!e || typeof e.type !== 'string') continue;
    if (!ALLOWED_TYPES.has(e.type)) continue;
    let meta = null;
    if (e.meta && typeof e.meta === 'object') {
      try {
        const s = JSON.stringify(e.meta);
        if (s.length <= MAX_META_BYTES) meta = e.meta;
      } catch { /* skip */ }
    }
    rows.push({
      userId: req.userId || null,
      type: e.type,
      path: typeof e.path === 'string' ? e.path.slice(0, 200) : null,
      meta,
    });
  }

  if (rows.length === 0) return res.json({ accepted: 0 });

  try {
    await prisma.usageEvent.createMany({ data: rows });
    res.json({ accepted: rows.length });
  } catch (err) {
    console.error('[events] insert error:', err.message);
    res.status(500).json({ error: 'Errore registrazione eventi' });
  }
});

module.exports = router;
