const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const { requirePremium } = require('../middleware/premium');
const { chatLimiter } = require('../middleware/rateLimit');
const { getChatResponse } = require('../lib/openai');

// POST /api/chat
router.post('/', requireAuth, requirePremium, chatLimiter, async (req, res) => {
  const { messages = [] } = req.body;

  try {
    const reply = await getChatResponse({ user: req.user, messages });
    res.json({ reply });
  } catch (err) {
    console.error('Chat AI error:', err);
    res.status(502).json({
      error: 'Servizio AI temporaneamente non disponibile. Riprova tra qualche momento.',
    });
  }
});

module.exports = router;
