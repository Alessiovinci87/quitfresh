const router = require('express').Router();
const prisma = require('../lib/prisma');
const { requireAuth, requireVerifiedEmail } = require('../middleware/auth');
const { checkFreeLimit, isFreeGated, FREE_LIMITS } = require('../middleware/premium');
const { chatLimiter } = require('../middleware/rateLimit');
const { getChatResponse } = require('../lib/openai');
const { buildChatContext } = require('../lib/chatContext');

// POST /api/chat
// Modello freemium: utenti free hanno 3 messaggi totali. Premium e
// grandfathered illimitati. Al superamento → 402 FREE_LIMIT_REACHED.
router.post('/', requireAuth, requireVerifiedEmail, chatLimiter, async (req, res) => {
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

  // Il primo "avvio chat" dal frontend manda messages=[] per ricevere il
  // saluto iniziale: non lo contiamo come messaggio utente. Si conta solo
  // se l'utente ha effettivamente scritto qualcosa.
  const isUserTurn = messages.length > 0 && messages[messages.length - 1].role === 'user';

  const limitCheck = checkFreeLimit({
    user: req.user,
    feature: 'chat',
    usedCount: req.user.chatMessagesUsed || 0,
  });
  if (isUserTurn && !limitCheck.allowed) {
    return res.status(402).json({
      error: 'FREE_LIMIT_REACHED',
      feature: 'chat',
      limit: limitCheck.limit,
      used: req.user.chatMessagesUsed || 0,
    });
  }

  try {
    const context = await buildChatContext(req.user);
    const reply = await getChatResponse({ user: req.user, messages, context });

    // Incrementa contatore SOLO per turni dell'utente e SOLO se gated.
    const shouldCount = isUserTurn && isFreeGated(req.user);
    if (shouldCount) {
      await prisma.user.update({
        where: { id: req.user.id },
        data: { chatMessagesUsed: { increment: 1 } },
      });
    }

    const newUsed = (req.user.chatMessagesUsed || 0) + (shouldCount ? 1 : 0);
    res.json({
      reply,
      freemium: isFreeGated(req.user)
        ? { used: newUsed, limit: FREE_LIMITS.chat, remaining: Math.max(0, FREE_LIMITS.chat - newUsed) }
        : null,
    });
  } catch (err) {
    console.error('Chat AI error:', err);
    res.status(502).json({
      error: 'Servizio AI temporaneamente non disponibile. Riprova tra qualche momento.',
    });
  }
});

module.exports = router;
