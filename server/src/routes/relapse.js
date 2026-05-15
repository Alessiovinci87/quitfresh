const router = require('express').Router();
const prisma = require('../lib/prisma');
const { requireAuth, requireVerifiedEmail } = require('../middleware/auth');
const { requirePremium } = require('../middleware/premium');

router.use(requireAuth, requireVerifiedEmail, requirePremium);

// POST /api/relapse — registra una ricaduta e azzera il contatore
router.post('/', async (req, res) => {
  const user = req.user;

  try {
    if (user.quitDate) {
      await prisma.quitAttempt.create({
        data: {
          userId: user.id,
          startDate: user.quitDate,
          endDate: new Date(),
        },
      });
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { quitDate: null, streakFreezesUsed: 0 },
    });

    const { passwordHash, ...safe } = updated;
    res.json({ user: safe });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore durante il reset del contatore' });
  }
});

// POST /api/relapse/restart — imposta una nuova data di inizio
router.post('/restart', async (req, res) => {
  try {
    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: { quitDate: new Date(), streakFreezesUsed: 0 },
    });

    const { passwordHash, ...safe } = updated;
    res.json({ user: safe });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore durante il riavvio del percorso' });
  }
});

// DELETE /api/relapse/history — cancella tutti i QuitAttempt dell'utente
// Azzera Record e i tentativi precedenti (utile dopo test o per pulire).
// Non tocca quitDate corrente.
router.delete('/history', async (req, res) => {
  try {
    const result = await prisma.quitAttempt.deleteMany({
      where: { userId: req.user.id },
    });
    res.json({ ok: true, deleted: result.count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore durante il reset della cronologia' });
  }
});

// POST /api/relapse/freeze — usa un freeze invece di azzerare lo streak
// Anti-double-spend: ricalcola disponibilità lato server e blocca se 0.
router.post('/freeze', async (req, res) => {
  const FREEZE_EVERY = 7;
  const FREEZE_CAP = 3;

  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: 'Utente non trovato' });
    if (!user.quitDate) return res.status(400).json({ error: 'Nessuno streak attivo' });

    const daysSinceQuit = Math.max(0, Math.floor((Date.now() - new Date(user.quitDate)) / (1000 * 60 * 60 * 24)));
    const earned = Math.floor(daysSinceQuit / FREEZE_EVERY);
    const available = Math.max(0, Math.min(FREEZE_CAP, earned - (user.streakFreezesUsed || 0)));

    if (available <= 0) {
      return res.status(400).json({ error: 'Nessun freeze disponibile', freezesAvailable: 0 });
    }

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: { streakFreezesUsed: { increment: 1 } },
    });

    const { passwordHash, ...safe } = updated;
    res.json({ user: safe, freezesAvailable: available - 1 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore durante l\'uso del freeze' });
  }
});

module.exports = router;
