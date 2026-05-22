// API analytics admin-only. Montato sotto /api/admin/analytics.
// requireAuth + requireVerifiedEmail + requireAdmin sono applicati a monte
// dal router admin.js via app.use.
const router = require('express').Router();
const prisma = require('../lib/prisma');
const { buildDailyReportData, buildUserTimeline } = require('../lib/analytics');

// GET /api/admin/analytics/summary?days=7
// Dashboard principale: DAU/WAU/MAU, eventi per tipo, nuove reg, conversioni.
router.get('/summary', async (req, res) => {
  try {
    const days = Math.min(parseInt(req.query.days) || 30, 90);
    const data = await buildDailyReportData({ days });
    res.json(data);
  } catch (err) {
    console.error('[analytics] summary error:', err);
    res.status(500).json({ error: 'Errore' });
  }
});

// GET /api/admin/analytics/live?limit=50
// Ultimi eventi in tempo reale, per timeline live.
router.get('/live', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const events = await prisma.usageEvent.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { user: { select: { id: true, email: true } } },
    });
    res.json({ events });
  } catch (err) {
    console.error('[analytics] live error:', err);
    res.status(500).json({ error: 'Errore' });
  }
});

// GET /api/admin/analytics/users
// Lista utenti con metriche aggregate per dashboard.
router.get('/users', async (_req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        createdAt: true,
        lastActiveAt: true,
        isPremium: true,
        premiumSince: true,
        emailVerified: true,
        cigarettesPerDay: true,
        quitDate: true,
        smokeFreeSince: true,
        cravingsBattled: true,
        chatMessagesUsed: true,
        promoCodeUsed: true,
        _count: {
          select: {
            diaryEntries: true,
            cravingLogs: true,
            cravingSessions: true,
            usageEvents: true,
            pushSubscriptions: true,
          },
        },
      },
    });
    res.json({ users });
  } catch (err) {
    console.error('[analytics] users error:', err);
    res.status(500).json({ error: 'Errore' });
  }
});

// GET /api/admin/analytics/user/:id
// Dettaglio singolo utente: profilo + timeline (eventi + reconstruction da
// tabelle esistenti per utenti pre-telemetria).
router.get('/user/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    const data = await buildUserTimeline(userId);
    if (!data) return res.status(404).json({ error: 'Utente non trovato' });
    res.json(data);
  } catch (err) {
    console.error('[analytics] user detail error:', err);
    res.status(500).json({ error: 'Errore' });
  }
});

module.exports = router;
