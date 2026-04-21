const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { requireAuth } = require('../middleware/auth');
const { cravingLimiter } = require('../middleware/rateLimit');
const { getCravingResponse } = require('../lib/openai');

const prisma = new PrismaClient();

// POST /api/craving
router.post('/', requireAuth, cravingLimiter, async (req, res) => {
  const { context = '' } = req.body;

  try {
    let aiResponse;
    try {
      aiResponse = await getCravingResponse({ user: req.user, context });
    } catch (aiErr) {
      console.error('OpenAI error:', aiErr);
      return res.status(502).json({
        error: 'Servizio AI temporaneamente non disponibile. Riprova tra qualche minuto.',
      });
    }

    const log = await prisma.cravingLog.create({
      data: {
        userId: req.user.id,
        context,
        resolved: false,
      },
    });

    res.json({ id: log.id, ...aiResponse });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore durante la gestione del craving' });
  }
});

// PATCH /api/craving/:id/resolve
router.patch('/:id/resolve', requireAuth, async (req, res) => {
  try {
    const log = await prisma.cravingLog.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });

    if (!log) {
      return res.status(404).json({ error: 'Craving non trovato' });
    }

    const updated = await prisma.cravingLog.update({
      where: { id: req.params.id },
      data: { resolved: true },
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore durante l\'aggiornamento' });
  }
});

// GET /api/craving/history
router.get('/history', requireAuth, async (req, res) => {
  try {
    const logs = await prisma.cravingLog.findMany({
      where: { userId: req.user.id },
      orderBy: { timestamp: 'desc' },
      take: 50,
    });
    res.json(logs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore nel recupero della cronologia' });
  }
});

module.exports = router;
