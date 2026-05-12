const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { requireAuth } = require('../middleware/auth');

const prisma = new PrismaClient();

// POST /api/quiz
router.post('/', requireAuth, async (req, res) => {
  const { cigarettesPerDay, criticalMoments, dependencyLevel, quitDate, cytisineStartDate, firstDoseTime } = req.body;

  if (cigarettesPerDay === undefined || !dependencyLevel) {
    return res.status(400).json({ error: 'Dati del quiz incompleti' });
  }

  if (dependencyLevel < 1 || dependencyLevel > 5) {
    return res.status(400).json({ error: 'Il livello di dipendenza deve essere tra 1 e 5' });
  }

  try {
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        cigarettesPerDay: parseInt(cigarettesPerDay),
        criticalMoments: Array.isArray(criticalMoments) ? criticalMoments : [],
        dependencyLevel: parseInt(dependencyLevel),
        quitDate: quitDate ? new Date(quitDate) : new Date(),
        ...(cytisineStartDate !== undefined && {
          cytisineStartDate: cytisineStartDate ? new Date(cytisineStartDate) : null,
        }),
        ...(firstDoseTime !== undefined && {
          firstDoseTime: firstDoseTime || null,
        }),
      },
    });

    const { passwordHash, ...safe } = user;
    res.json({ user: safe });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore durante il salvataggio del profilo' });
  }
});

// PATCH /api/quiz/quit-date — aggiorna solo la data di quit
router.patch('/quit-date', requireAuth, async (req, res) => {
  const { quitDate } = req.body;
  if (!quitDate) return res.status(400).json({ error: 'quitDate obbligatoria' });
  try {
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { quitDate: new Date(quitDate) },
    });
    const { passwordHash, ...safe } = user;
    res.json({ user: safe });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore aggiornamento data' });
  }
});

module.exports = router;
