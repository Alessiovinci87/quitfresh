const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { requireAuth } = require('../middleware/auth');

const prisma = new PrismaClient();

function dayStart(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

// GET /api/diary — ultimi 30 giorni
router.get('/', requireAuth, async (req, res) => {
  try {
    const entries = await prisma.diaryEntry.findMany({
      where: { userId: req.user.id },
      orderBy: { date: 'desc' },
      take: 30,
    });
    res.json(entries);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore nel recupero del diario' });
  }
});

// POST /api/diary — crea o aggiorna l'entry di oggi
router.post('/', requireAuth, async (req, res) => {
  const { date, pillsTaken, cigarettesToday, sideEffects, notes } = req.body;

  if (pillsTaken === undefined) {
    return res.status(400).json({ error: 'pillsTaken è obbligatorio' });
  }

  try {
    const entryDate = dayStart(date || new Date());

    const entry = await prisma.diaryEntry.upsert({
      where: { userId_date: { userId: req.user.id, date: entryDate } },
      update: {
        pillsTaken: parseInt(pillsTaken),
        cigarettesToday: parseInt(cigarettesToday ?? 0),
        sideEffects: Array.isArray(sideEffects) ? sideEffects : [],
        notes: notes ?? '',
      },
      create: {
        userId: req.user.id,
        date: entryDate,
        pillsTaken: parseInt(pillsTaken),
        cigarettesToday: parseInt(cigarettesToday ?? 0),
        sideEffects: Array.isArray(sideEffects) ? sideEffects : [],
        notes: notes ?? '',
      },
    });
    res.json(entry);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore nel salvataggio del diario' });
  }
});

module.exports = router;
