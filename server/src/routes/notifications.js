const router = require('express').Router();
const prisma = require('../lib/prisma');
const { requireAuth, requireVerifiedEmail } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');
const { isEnabled, sendPush } = require('../lib/push');
const webpush = require('web-push');

// GET /api/notifications/vapid-key
router.get('/vapid-key', (_req, res) => {
  if (!isEnabled()) {
    return res.json({ enabled: false, publicKey: null });
  }
  res.json({ enabled: true, publicKey: process.env.VAPID_PUBLIC_KEY });
});

// POST /api/notifications/subscribe
router.post('/subscribe', requireAuth, requireVerifiedEmail, async (req, res) => {
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
router.delete('/subscribe', requireAuth, requireVerifiedEmail, async (req, res) => {
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
router.put('/times', requireAuth, requireVerifiedEmail, async (req, res) => {
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

// PUT /api/notifications/encouragement — orario incoraggiamento giornaliero
// body: { time: "HH:MM" } per attivare, { time: null } per disattivare
router.put('/encouragement', requireAuth, requireVerifiedEmail, async (req, res) => {
  const { time } = req.body;
  if (time !== null && !/^\d{2}:\d{2}$/.test(time || '')) {
    return res.status(400).json({ error: 'time deve essere HH:MM o null' });
  }

  try {
    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: { encouragementTime: time },
    });
    const { passwordHash, ...safe } = updated;
    res.json({ user: safe });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore nel salvataggio dell\'orario' });
  }
});

// GET /api/notifications/debug — diagnostica (solo autenticati)
router.get('/debug', requireAuth, requireVerifiedEmail, requireAdmin, async (req, res) => {
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const email = process.env.VAPID_EMAIL;

  let vapidOk = false;
  let vapidError = null;
  try {
    webpush.setVapidDetails(email || 'mailto:test@test.it', pub, priv);
    vapidOk = true;
  } catch (e) {
    vapidError = e.message;
  }

  const subs = await prisma.pushSubscription.findMany({ where: { userId: req.user.id } });

  res.json({
    vapidKeysSet: !!(pub && priv),
    vapidValid: vapidOk,
    vapidError,
    subscriptionsCount: subs.length,
    subscriptionEndpoints: subs.map(s => s.endpoint.slice(0, 60) + '…'),
  });
});

// POST /api/notifications/test — invia push di test immediata
router.post('/test', requireAuth, requireVerifiedEmail, async (req, res) => {
  const pub = (process.env.VAPID_PUBLIC_KEY || '').trim().replace(/[^A-Za-z0-9\-_]/g, '');
  const priv = (process.env.VAPID_PRIVATE_KEY || '').trim().replace(/[^A-Za-z0-9\-_]/g, '');
  const email = (process.env.VAPID_EMAIL || 'mailto:admin@quitfresh.app').trim();

  if (!pub || !priv) return res.status(500).json({ error: 'VAPID non configurato' });

  try {
    webpush.setVapidDetails(email, pub, priv);
  } catch (e) {
    return res.status(500).json({ error: 'Chiave VAPID non valida: ' + e.message + ' | lunghezza chiave: ' + pub.length });
  }

  const subs = await prisma.pushSubscription.findMany({ where: { userId: req.user.id } });
  if (subs.length === 0) return res.status(404).json({ error: 'Nessuna subscription trovata per questo utente' });

  const results = [];
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify({ title: 'QuitFresh · Test', body: 'Notifiche push funzionanti!' })
      );
      results.push({ endpoint: sub.endpoint.slice(0, 50), status: 'ok' });
    } catch (err) {
      results.push({ endpoint: sub.endpoint.slice(0, 50), status: 'errore', detail: err.message, code: err.statusCode });
    }
  }

  res.json({ results });
});

module.exports = router;
