const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');
const { loginLimiter } = require('../middleware/rateLimit');
const { sendVerifyEmail } = require('../lib/email');

function signToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '30d' });
}

function buildVerifyLink(token) {
  const base = (process.env.CLIENT_BASE_URL || 'http://localhost:5173').replace(/\/$/, '');
  return `${base}/verify-email?token=${token}`;
}

async function generateAndSendVerifyToken(user) {
  const token = crypto.randomUUID();
  await prisma.user.update({
    where: { id: user.id },
    data: { verifyToken: token },
  });
  const link = buildVerifyLink(token);
  await sendVerifyEmail(user.email, link);
  return token;
}

// Email regex semplice ma sufficiente per validation lato server (controllo
// formato + lunghezza max). Validation server-side e' safety net contro
// bypass client.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/auth/register
router.post('/register', loginLimiter, async (req, res) => {
  const { email, password } = req.body;

  if (typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Email e password sono obbligatorie' });
  }
  const normalizedEmail = email.trim().toLowerCase();
  if (normalizedEmail.length === 0 || normalizedEmail.length > 254 || !EMAIL_RE.test(normalizedEmail)) {
    return res.status(400).json({ error: 'Email non valida' });
  }
  if (password.length < 8 || password.length > 256) {
    return res.status(400).json({ error: 'La password deve avere tra 8 e 256 caratteri' });
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return res.status(409).json({ error: 'Email già registrata' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const verifyToken = crypto.randomUUID();
    const user = await prisma.user.create({
      data: { email: normalizedEmail, passwordHash, verifyToken },
    });

    // Invio email in background — un fallimento non deve bloccare la registrazione.
    sendVerifyEmail(user.email, buildVerifyLink(verifyToken))
      .catch(err => console.error('[register] email error:', err));

    const token = signToken(user.id);
    res.status(201).json({ token, user: sanitize(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore durante la registrazione' });
  }
});

// POST /api/auth/login
router.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body;

  if (typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Email e password sono obbligatorie' });
  }
  const normalizedEmail = email.trim().toLowerCase();

  try {
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) {
      return res.status(401).json({ error: 'Credenziali non valide' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Credenziali non valide' });
    }

    const token = signToken(user.id);
    res.json({ token, user: sanitize(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore durante il login' });
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: sanitize(req.user) });
});

// GET /api/auth/verify-email?token=...
router.get('/verify-email', async (req, res) => {
  const { token } = req.query || {};
  if (!token) return res.status(400).json({ error: 'Token mancante' });

  try {
    const user = await prisma.user.findUnique({ where: { verifyToken: String(token) } });
    if (!user) return res.status(400).json({ error: 'Token non valido' });

    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true, verifyToken: null },
    });
    res.json({ message: 'Email verificata' });
  } catch (err) {
    console.error('verify-email error:', err);
    res.status(500).json({ error: 'Errore durante la verifica email' });
  }
});

// POST /api/auth/resend-verify — rigenera un nuovo token e logga il link.
router.post('/resend-verify', requireAuth, async (req, res) => {
  if (req.user.emailVerified) {
    return res.json({ message: 'Email già verificata' });
  }
  try {
    await generateAndSendVerifyToken(req.user);
    res.json({ message: 'Link di verifica inviato. Controlla la tua casella email.' });
  } catch (err) {
    console.error('resend-verify error:', err);
    res.status(500).json({ error: 'Errore durante l\'invio del link' });
  }
});

// GET /api/auth/export — Diritto alla portabilita' dei dati (GDPR art. 20).
// Ritorna un JSON scaricabile con tutti i dati personali dell'utente:
// profilo, diary, craving, quit attempts, push subscriptions.
// Esclude passwordHash, token, sessione (dati sensibili che NON sono
// "dati personali" GDPR).
router.get('/export', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const [user, diaryEntries, cravingLogs, quitAttempts, pushSubscriptions] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true, email: true, createdAt: true,
          cigarettesPerDay: true, cigarettePackPrice: true,
          criticalMoments: true, dependencyLevel: true,
          quitDate: true, smokeFreeSince: true,
          cytisineStartDate: true, firstDoseTime: true, cytisineSchedule: true,
          notificationTimes: true, encouragementTime: true,
          isPremium: true, premiumSince: true, promoCodeUsed: true,
          emailVerified: true, streakFreezesUsed: true,
        },
      }),
      prisma.diaryEntry.findMany({ where: { userId }, orderBy: { date: 'asc' } }),
      prisma.cravingLog.findMany({ where: { userId }, orderBy: { timestamp: 'asc' } }),
      prisma.quitAttempt.findMany({ where: { userId }, orderBy: { startDate: 'asc' } }),
      prisma.pushSubscription.findMany({
        where: { userId },
        select: { endpoint: true, createdAt: true },
      }),
    ]);
    res.setHeader('Content-Disposition', `attachment; filename=quitfresh-export-${userId}.json`);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.json({
      exportedAt: new Date().toISOString(),
      gdprNote: 'Dati personali ai sensi del GDPR art. 20 (portabilita\'). passwordHash, token e dati sessione esclusi.',
      user,
      diaryEntries,
      cravingLogs,
      quitAttempts,
      pushSubscriptions,
    });
  } catch (err) {
    console.error('GDPR export error:', err);
    res.status(500).json({ error: 'Errore durante l\'export dei dati' });
  }
});

// DELETE /api/auth/me — cancellazione account (GDPR).
// Lo schema ha onDelete: Cascade su CravingLog, QuitAttempt, DiaryEntry,
// PushSubscription — Prisma cancella in cascata in un'unica operazione.
router.delete('/me', requireAuth, async (req, res) => {
  try {
    await prisma.user.delete({ where: { id: req.user.id } });
    res.status(204).end();
  } catch (err) {
    console.error('Account deletion error:', err);
    res.status(500).json({ error: 'Errore durante la cancellazione dell\'account' });
  }
});

function sanitize(user) {
  const { passwordHash, ...safe } = user;
  return safe;
}

module.exports = router;
