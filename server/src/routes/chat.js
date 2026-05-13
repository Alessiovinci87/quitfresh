const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const { getChatResponse } = require('../lib/openai');
const { isConfigured: stripeConfigured } = require('../lib/stripe');

// POST /api/chat
router.post('/', requireAuth, async (req, res) => {
  const { messages = [] } = req.body;

  if (stripeConfigured() && !req.user.isPremium) {
    return res.status(402).json({ error: 'PREMIUM_REQUIRED' });
  }

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
