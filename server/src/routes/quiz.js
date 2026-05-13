const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { requireAuth } = require('../middleware/auth');

const prisma = new PrismaClient();

// POST /api/quiz — partial update: aggiorna solo i campi forniti
router.post('/', requireAuth, async (req, res) => {
  const { cigarettesPerDay, criticalMoments, dependencyLevel, quitDate, cytisineStartDate, firstDoseTime } = req.body;

  if (dependencyLevel != null && (dependencyLevel < 1 || dependencyLevel > 5)) {
    return res.status(400).json({ error: 'Il livello di dipendenza deve essere tra 1 e 5' });
  }

  const data = {};
  if (cigarettesPerDay !== undefined) {
    data.cigarettesPerDay = cigarettesPerDay == null ? null : parseInt(cigarettesPerDay);
  }
  if (Array.isArray(criticalMoments)) {
    data.criticalMoments = criticalMoments;
  }
  if (dependencyLevel !== undefined) {
    data.dependencyLevel = dependencyLevel == null ? null : parseInt(dependencyLevel);
  }
  if (quitDate !== undefined) {
    data.quitDate = quitDate ? new Date(quitDate) : null;
  }
  if (cytisineStartDate !== undefined) {
    data.cytisineStartDate = cytisineStartDate ? new Date(cytisineStartDate) : null;
  }
  if (firstDoseTime !== undefined) {
    data.firstDoseTime = firstDoseTime || null;
  }

  try {
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data,
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

// PATCH /api/quiz/smoke-free-since — imposta il momento di inizio astinenza
router.patch('/smoke-free-since', requireAuth, async (req, res) => {
  const { smokeFreeSince } = req.body;
  try {
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { smokeFreeSince: smokeFreeSince ? new Date(smokeFreeSince) : null },
    });
    const { passwordHash, ...safe } = user;
    res.json({ user: safe });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore aggiornamento' });
  }
});

module.exports = router;
