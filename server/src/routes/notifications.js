const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { requireAuth } = require('../middleware/auth');
const { isEnabled } = require('../lib/push');

const prisma = new PrismaClient();

// GET /api/notifications/vapid-key
router.get('/vapid-key', (_req, res) => {
  if (!isEnabled()) {
    return res.json({ enabled: false, publicKey: null });
  }
  res.json({ enabled: true, publicKey: process.env.VAPID_PUBLIC_KEY });
});

// POST /api/notifications/subscribe
router.post('/subscribe', requireAuth, async (req, res) => {
  const { endpoint, keys } = req.body;
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return res.status(400).json({ error: 'Dati subscription non validi' });
  }

  try {
    await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: { p256dh: keys.p256dh, auth: keys.auth, userId: req.user.id },
      create: { userId: req.user.id, endpoint, p256dh: keys.p256dh, auth: keys.auth },
    });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore nel salvataggio della subscription' });
  }
});

// DELETE /api/notifications/subscribe
router.delete('/subscribe', requireAuth, async (req, res) => {
  const { endpoint } = req.body;
  if (!endpoint) return res.status(400).json({ error: 'endpoint mancante' });

  try {
    await prisma.pushSubscription.deleteMany({
      where: { endpoint, userId: req.user.id },
    });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore nella rimozione della subscription' });
  }
});

// PUT /api/notifications/times — salva orari promemoria
router.put('/times', requireAuth, async (req, res) => {
  const { times } = req.body;
  if (!Array.isArray(times)) {
    return res.status(400).json({ error: 'times deve essere un array di stringhe HH:MM' });
  }

  const valid = times.filter(t => /^\d{2}:\d{2}$/.test(t));

  try {
    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: { notificationTimes: valid },
    });
    const { passwordHash, ...safe } = updated;
    res.json({ user: safe });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore nel salvataggio degli orari' });
  }
});

module.exports = router;
