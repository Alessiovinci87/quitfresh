const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { requireAuth } = require('../middleware/auth');

const prisma = new PrismaClient();

function signToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '30d' });
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
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
    const user = await prisma.user.create({
      data: { email, passwordHash },
    });

    const token = signToken(user.id);
    res.status(201).json({ token, user: sanitize(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore durante la registrazione' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
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

function sanitize(user) {
  const { passwordHash, ...safe } = user;
  return safe;
}

module.exports = router;
