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

// POST /api/auth/register
router.post('/register', loginLimiter, async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email e password sono obbligatorie' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'La password deve avere almeno 6 caratteri' });
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'Email già registrata' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const verifyToken = crypto.randomUUID();
    const user = await prisma.user.create({
      data: { email, passwordHash, verifyToken },
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

  if (!email || !password) {
    return res.status(400).json({ error: 'Email e password sono obbligatorie' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
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
