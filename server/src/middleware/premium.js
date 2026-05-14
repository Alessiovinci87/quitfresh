const { isConfigured } = require('../lib/stripe');

// Se Stripe non è configurato (dev locale senza chiavi) lasciamo passare,
// così l'app rimane usabile senza obbligare l'integrazione completa.
function requirePremium(req, res, next) {
  if (!isConfigured()) return next();
  if (req.user?.isPremium) return next();
  return res.status(402).json({ error: 'PREMIUM_REQUIRED' });
}

module.exports = { requirePremium };
