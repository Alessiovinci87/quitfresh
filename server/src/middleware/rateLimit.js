const rateLimit = require('express-rate-limit');

const cravingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 ora
  max: 100,
  keyGenerator: (req) => req.user?.id || req.ip,
  handler: (_req, res) => {
    res.status(429).json({
      error: 'Hai raggiunto il limite di richieste all\'ora. Riprova più tardi.',
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Chat AI: 30/h free, 100/h premium. Chiave = userId (richiede requireAuth prima).
const chatLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: (req) => (req.user?.isPremium ? 100 : 30),
  keyGenerator: (req) => req.user?.id || req.ip,
  handler: (_req, res) => {
    res.status(429).json({
      error: 'Limite messaggi raggiunto. Riprova tra un\'ora.',
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { cravingLimiter, chatLimiter };
