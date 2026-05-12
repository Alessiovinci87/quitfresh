const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { requireAuth } = require('../middleware/auth');

const prisma = new PrismaClient();

// GET /api/progress
router.get('/', requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: 'Utente non trovato' });
    const now = new Date();

    const daysSinceQuit = user.quitDate
      ? Math.max(0, Math.floor((now - new Date(user.quitDate)) / (1000 * 60 * 60 * 24)))
      : 0;

    const cigarettesAvoided = daysSinceQuit * (user.cigarettesPerDay || 0);

    const moneySaved = cigarettesAvoided * 0.35; // stima ~35 cent a sigaretta

    const badges = computeBadges(daysSinceQuit);

    const cravingCount = await prisma.cravingLog.count({
      where: { userId: user.id },
    });

    const resolvedCount = await prisma.cravingLog.count({
      where: { userId: user.id, resolved: true },
    });

    const pastAttempts = await prisma.quitAttempt.findMany({
      where: { userId: user.id },
      orderBy: { startDate: 'desc' },
    });

    const bestDays = pastAttempts.reduce((max, a) => {
      if (!a.endDate) return max;
      const d = Math.floor((new Date(a.endDate) - new Date(a.startDate)) / (1000 * 60 * 60 * 24));
      return d > max ? d : max;
    }, 0);

    res.json({
      daysSinceQuit,
      cigarettesAvoided,
      moneySaved: Math.round(moneySaved * 100) / 100,
      badges,
      cravingCount,
      resolvedCount,
      quitDate: user.quitDate,
      smokeFreeSince: user.smokeFreeSince,
      pastAttempts: pastAttempts.map(a => ({
        startDate: a.startDate,
        endDate: a.endDate,
        days: a.endDate
          ? Math.floor((new Date(a.endDate) - new Date(a.startDate)) / (1000 * 60 * 60 * 24))
          : null,
      })),
      bestDays,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore nel recupero del progresso' });
  }
});

function computeBadges(days) {
  const all = [
    { id: 'day1', label: 'Primo giorno', days: 1 },
    { id: 'day3', label: 'Tre giorni', days: 3 },
    { id: 'week1', label: 'Prima settimana', days: 7 },
    { id: 'day14', label: 'Due settimane', days: 14 },
    { id: 'month1', label: 'Primo mese', days: 30 },
    { id: 'month3', label: 'Tre mesi', days: 90 },
  ];
  return all.map((b) => ({ ...b, earned: days >= b.days }));
}

module.exports = router;
