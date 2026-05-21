const router = require('express').Router();
const prisma = require('../lib/prisma');
const { requireAuth, requireVerifiedEmail } = require('../middleware/auth');

const ACTION_TYPES = new Set(['water', 'teeth', 'squats', 'walk', 'gum']);

// SOS Craving e' una feature di retention FREE (no AI = no costi marginali).
// Niente requirePremium qui.
router.use(requireAuth, requireVerifiedEmail);

// POST /api/sos/sessions
// Body: { intensityBefore, intensityAfter, type }
// Crea la sessione e incrementa User.cravingsBattled in una transazione.
router.post('/sessions', async (req, res) => {
  const { intensityBefore, intensityAfter, type } = req.body;

  const before = parseInt(intensityBefore, 10);
  const after = intensityAfter == null ? null : parseInt(intensityAfter, 10);

  if (!Number.isFinite(before) || before < 0 || before > 10) {
    return res.status(400).json({ error: 'intensityBefore deve essere 0-10' });
  }
  if (after != null && (!Number.isFinite(after) || after < 0 || after > 10)) {
    return res.status(400).json({ error: 'intensityAfter deve essere 0-10' });
  }
  if (!ACTION_TYPES.has(type)) {
    return res.status(400).json({ error: 'type non valido' });
  }

  try {
    const [session, user] = await prisma.$transaction([
      prisma.cravingSession.create({
        data: {
          userId: req.user.id,
          intensityBefore: before,
          intensityAfter: after,
          type,
        },
      }),
      prisma.user.update({
        where: { id: req.user.id },
        data: { cravingsBattled: { increment: 1 } },
        select: { cravingsBattled: true },
      }),
    ]);

    res.json({ session, cravingsBattled: user.cravingsBattled });
  } catch (err) {
    console.error('SOS session error:', err);
    res.status(500).json({ error: 'Errore durante il salvataggio della sessione' });
  }
});

// GET /api/sos/stats — counter + delta medio + ultime 10 sessioni
router.get('/stats', async (req, res) => {
  try {
    const [user, recent] = await Promise.all([
      prisma.user.findUnique({
        where: { id: req.user.id },
        select: { cravingsBattled: true },
      }),
      prisma.cravingSession.findMany({
        where: { userId: req.user.id, intensityAfter: { not: null } },
        orderBy: { completedAt: 'desc' },
        take: 10,
      }),
    ]);

    const deltas = recent.map(s => s.intensityBefore - s.intensityAfter);
    const avgDelta = deltas.length
      ? deltas.reduce((a, b) => a + b, 0) / deltas.length
      : 0;

    res.json({
      cravingsBattled: user?.cravingsBattled || 0,
      avgDelta: Math.round(avgDelta * 10) / 10,
      recent,
    });
  } catch (err) {
    console.error('SOS stats error:', err);
    res.status(500).json({ error: 'Errore stats' });
  }
});

module.exports = router;
