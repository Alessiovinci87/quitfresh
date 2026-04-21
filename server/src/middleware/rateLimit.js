const rateLimit = require('express-rate-limit');

const cravingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 ora
  max: 10,
  keyGenerator: (req) => req.user?.id || req.ip,
  handler: (_req, res) => {
    res.status(429).json({
      error: 'Hai raggiunto il limite di 10 richieste all\'ora. Riprova più tardi.',
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { cravingLimiter };
