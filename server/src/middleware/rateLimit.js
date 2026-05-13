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

// Login / register: protezione anti brute-force basata su IP (richiede
// app.set('trust proxy', 1) lato server per leggere l'IP reale).
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minuti
  limit: 15,
  keyGenerator: (req) => req.ip,
  handler: (_req, res) => {
    res.status(429).json({
      error: 'Troppi tentativi. Riprova tra qualche minuto.',
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Forgot-password: previene email bombing e enumerazione account.
const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minuti
  limit: 3,
  keyGenerator: (req) => req.ip,
  handler: (_req, res) => {
    res.status(429).json({
      error: 'Troppe richieste di reset. Riprova tra qualche minuto.',
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { cravingLimiter, chatLimiter, loginLimiter, forgotPasswordLimiter };
