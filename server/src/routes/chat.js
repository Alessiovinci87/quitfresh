const router = require('express').Router();
const prisma = require('../lib/prisma');
const { requireAuth, requireVerifiedEmail } = require('../middleware/auth');
const { isFreeGated, FREE_LIMITS, getChatWindow } = require('../middleware/premium');
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

  // Finestra settimanale: 10 messaggi ogni 7gg dalla prima interazione.
  // Se la finestra e' scaduta, il counter viene resettato qui (used=0)
  // e verra' persistito al primo increment piu' sotto.
  const gated = isFreeGated(req.user);
  const win = getChatWindow(req.user);
  if (gated && isUserTurn && win.used >= FREE_LIMITS.chat) {
    return res.status(402).json({
      error: 'FREE_LIMIT_REACHED',
      feature: 'chat',
      limit: FREE_LIMITS.chat,
      used: win.used,
      // Quando si riapre la finestra (epoch ms) per messaggio UI.
      windowResetsAt: win.weekStart
        ? new Date(win.weekStart.getTime() + 7 * 86400000).toISOString()
        : null,
    });
  }

  try {
    const context = await buildChatContext(req.user);
    const reply = await getChatResponse({ user: req.user, messages, context });

    // Increment + reset finestra se necessario.
    // shouldCount: turno utente reale + utente gated.
    const shouldCount = isUserTurn && gated;
    let newUsed = win.used;
    if (shouldCount) {
      newUsed = win.used + 1;
      await prisma.user.update({
        where: { id: req.user.id },
        data: {
          chatMessagesUsed: newUsed,
          // Apre nuova finestra se era scaduta o mai aperta.
          ...(win.expired ? { chatWeekStart: new Date() } : {}),
        },
      });
    }

    const windowResetsAt = (() => {
      if (!gated) return null;
      const start = win.expired ? new Date() : win.weekStart;
      return start ? new Date(start.getTime() + 7 * 86400000).toISOString() : null;
    })();

    res.json({
      reply,
      freemium: gated
        ? {
            used: newUsed,
            limit: FREE_LIMITS.chat,
            remaining: Math.max(0, FREE_LIMITS.chat - newUsed),
            windowResetsAt,
          }
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
