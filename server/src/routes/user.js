const router = require('express').Router();
const prisma = require('../lib/prisma');
const { requireAuth, requireVerifiedEmail } = require('../middleware/auth');

// POST /api/user/complete-welcome-flow
// Marca il welcome flow post-onboarding come visto. Idempotente: settarlo
// di nuovo non ha effetti collaterali. Ritorna l'utente sanitizzato cosi'
// il client puo' aggiornare lo stato e sbloccare la home.
router.post('/complete-welcome-flow', requireAuth, requireVerifiedEmail, async (req, res) => {
  try {
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { welcomeFlowCompleted: true },
    });
    const { passwordHash, ...safe } = user;
    res.json({ user: safe });
  } catch (err) {
    console.error('complete-welcome-flow error:', err);
    res.status(500).json({ error: 'Errore aggiornamento' });
  }
});

module.exports = router;
