const router = require('express').Router();
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');
const { requirePremium } = require('../middleware/premium');

router.use(requireAuth, requirePremium);

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
      data: { quitDate: null },
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
      data: { quitDate: new Date() },
    });

    const { passwordHash, ...safe } = updated;
    res.json({ user: safe });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore durante il riavvio del percorso' });
  }
});

module.exports = router;
