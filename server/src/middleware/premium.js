const { isConfigured } = require('../lib/stripe');

const FREE_LIMITS = {
  chat: 10,   // messaggi per settimana ricorrente
  diary: 7,   // entry totali
  cytisinePushDays: 3,
};

const CHAT_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

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

// Calcola lo stato della finestra settimanale chat per un utente.
// Ritorna { used, weekStart, expired } dove expired=true se la finestra
// e' passata e va resettata prima del prossimo incremento.
function getChatWindow(user, now = new Date()) {
  const weekStart = user.chatWeekStart ? new Date(user.chatWeekStart) : null;
  const expired = !weekStart || (now - weekStart) >= CHAT_WEEK_MS;
  return {
    used: expired ? 0 : (user.chatMessagesUsed || 0),
    weekStart,
    expired,
  };
}

module.exports = { requirePremium, checkFreeLimit, isFreeGated, FREE_LIMITS, getChatWindow, CHAT_WEEK_MS };
