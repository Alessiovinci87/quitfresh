const router = require('express').Router();
const { requireAuth, requireVerifiedEmail } = require('../middleware/auth');
const { requirePremium } = require('../middleware/premium');
const { chatLimiter } = require('../middleware/rateLimit');
const { getChatResponse } = require('../lib/openai');

// POST /api/chat
router.post('/', requireAuth, requireVerifiedEmail, requirePremium, chatLimiter, async (req, res) => {
  const { messages = [] } = req.body;

  // Validation: messages array, max 100 entries (anti-DoS sull'API OpenAI
  // + costi). Ogni entry deve avere role 'user'|'assistant' e content
  // stringa max 4000 char (~1000 token).
  if (!Array.isArray(messages) || messages.length > 100) {
    return res.status(400).json({ error: 'Formato messages non valido' });
  }
  for (const m of messages) {
    if (!m || typeof m !== 'object') {
      return res.status(400).json({ error: 'Formato messages non valido' });
    }
    if (!['user', 'assistant'].includes(m.role)) {
      return res.status(400).json({ error: 'Role messages non valido' });
    }
    if (typeof m.content !== 'string' || m.content.length > 4000) {
      return res.status(400).json({ error: 'Content messages troppo lungo' });
    }
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
