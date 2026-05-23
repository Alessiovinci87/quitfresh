const router = require('express').Router();
const prisma = require('../lib/prisma');
const { requireAuth, requireVerifiedEmail } = require('../middleware/auth');
const { isFreeGated, FREE_LIMITS, getChatWindow } = require('../middleware/premium');
const { chatLimiter } = require('../middleware/rateLimit');
const { getChatResponse } = require('../lib/openai');
const { buildChatContext } = require('../lib/chatContext');

// Quanti messaggi storici caricare dal DB per dare contesto al modello.
// 10 = stesso cap gia' applicato in openai.js (commit 9331de3).
const HISTORY_CONTEXT_LIMIT = 10;
// Quanti messaggi ritornare al client all'apertura della chat.
const HISTORY_FETCH_LIMIT = 50;
// Limite hard di lunghezza singolo messaggio utente (anti-DoS + costi token).
const MAX_TEXT_LEN = 4000;

// GET /api/chat/history — cronologia chat ordinata asc.
// Limite 50: copre tipica sessione di lavoro. Il client puo' paginare in
// futuro con ?before=createdAt se servisse.
router.get('/history', requireAuth, requireVerifiedEmail, async (req, res) => {
  const rows = await prisma.chatMessage.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' },
    take: HISTORY_FETCH_LIMIT,
    select: { id: true, role: true, content: true, createdAt: true },
  });
  res.json({ messages: rows.reverse() });
});

// DELETE /api/chat/history — wipe conversazione utente.
// Non resetta il counter freemium: cancellare la storia non deve essere
// un workaround per ottenere altri messaggi gratuiti.
router.delete('/history', requireAuth, requireVerifiedEmail, async (req, res) => {
  await prisma.chatMessage.deleteMany({ where: { userId: req.user.id } });
  res.json({ ok: true });
});

// POST /api/chat — invia messaggio (o bootstrap saluto se text vuoto).
// Body: { text?: string, trigger?: 'sos' | 'welcome' }
// - text vuoto/assente → bootstrap: l'AI saluta, niente count freemium.
// - text presente → turno utente: count + persist user msg + reply.
router.post('/', requireAuth, requireVerifiedEmail, chatLimiter, async (req, res) => {
  const rawText = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
  const trigger = ['sos', 'welcome'].includes(req.body?.trigger) ? req.body.trigger : null;

  if (rawText.length > MAX_TEXT_LEN) {
    return res.status(400).json({ error: 'Messaggio troppo lungo' });
  }

  const isUserTurn = rawText.length > 0;
  const gated = isFreeGated(req.user);
  const win = getChatWindow(req.user);

  if (gated && isUserTurn && win.used >= FREE_LIMITS.chat) {
    return res.status(402).json({
      error: 'FREE_LIMIT_REACHED',
      feature: 'chat',
      limit: FREE_LIMITS.chat,
      used: win.used,
      windowResetsAt: win.weekStart
        ? new Date(win.weekStart.getTime() + 7 * 86400000).toISOString()
        : null,
    });
  }

  try {
    // Storia dal DB: il client non puo' falsificarla. Cap a ultimi 10
    // per costo token. Reverse perche' findMany torna desc.
    const historyRows = await prisma.chatMessage.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: HISTORY_CONTEXT_LIMIT,
      select: { role: true, content: true },
    });
    const history = historyRows.reverse();

    // Se turno utente, lo aggiungiamo solo al payload OpenAI (verra'
    // persistito sotto). Se bootstrap, payload vuoto → openai.js usa
    // il branch di saluto contestuale.
    const openaiMessages = isUserTurn
      ? [...history, { role: 'user', content: rawText }]
      : history;

    const context = await buildChatContext(req.user);
    // Trigger di apertura passato al builder del prompt: openai.js usa
    // questi flag per personalizzare il saluto bootstrap.
    const reply = await getChatResponse({
      user: req.user,
      messages: openaiMessages,
      context: { ...context, trigger },
    });

    // Persistenza: una sola transaction per atomicita'.
    // - Turno utente: salva user msg + assistant reply.
    // - Bootstrap: salva solo assistant reply (con eventuale trigger).
    const writes = [];
    if (isUserTurn) {
      writes.push(prisma.chatMessage.create({
        data: { userId: req.user.id, role: 'user', content: rawText, trigger },
      }));
    }
    writes.push(prisma.chatMessage.create({
      data: { userId: req.user.id, role: 'assistant', content: reply, trigger: isUserTurn ? null : trigger },
    }));
    await prisma.$transaction(writes);

    // Increment freemium counter solo per turno utente di utente gated.
    let newUsed = win.used;
    if (isUserTurn && gated) {
      newUsed = win.used + 1;
      await prisma.user.update({
        where: { id: req.user.id },
        data: {
          chatMessagesUsed: newUsed,
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
