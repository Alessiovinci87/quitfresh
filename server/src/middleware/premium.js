const { isConfigured } = require('../lib/stripe');

const FREE_LIMITS = {
  chat: 3,    // messaggi
  diary: 7,   // entry
  cytisinePushDays: 3,
};

// Utente "free attivo": va gated sulle feature freemium.
// Sono ESCLUSI: premium veri, grandfathered (utenti pre-rollout),
// e quando Stripe non e' configurato (dev locale).
function isFreeGated(user) {
  if (!isConfigured()) return false;
  if (!user) return false;
  if (user.isPremium) return false;
  if (user.freemiumGrandfathered) return false;
  return true;
}

// Verifica se un utente puo' ancora usare una feature limitata.
// Ritorna { allowed, remaining, limit }.
function checkFreeLimit({ user, feature, usedCount }) {
  const limit = FREE_LIMITS[feature];
  if (limit === undefined) return { allowed: true, remaining: Infinity, limit: null };
  if (!isFreeGated(user)) return { allowed: true, remaining: Infinity, limit };
  const used = usedCount ?? 0;
  return {
    allowed: used < limit,
    remaining: Math.max(0, limit - used),
    limit,
  };
}

// Per route 100% premium (es. stats avanzate, trigger analysis).
// Resta in uso anche nel modello freemium.
function requirePremium(req, res, next) {
  if (!isConfigured()) return next();
  if (req.user?.isPremium) return next();
  if (req.user?.freemiumGrandfathered) return next();
  return res.status(402).json({ error: 'PREMIUM_REQUIRED' });
}

module.exports = { requirePremium, checkFreeLimit, isFreeGated, FREE_LIMITS };
