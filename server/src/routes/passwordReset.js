const router = require('express').Router();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const { forgotPasswordLimiter } = require('../middleware/rateLimit');

function buildResetLink(token) {
  const base = (process.env.CLIENT_BASE_URL || 'http://localhost:5173').replace(/\/$/, '');
  return `${base}/reset-password?token=${token}`;
}

// POST /api/auth/forgot-password — rate-limited a 3 per 15 min per IP.
// Risponde sempre 200 con messaggio generico per non rivelare se l'email esiste.
router.post('/forgot-password', forgotPasswordLimiter, async (req, res) => {
  const { email } = req.body || {};

  const generic = {
    message: 'Se questa email è registrata, riceverai le istruzioni per reimpostare la password.',
  };

  if (!email || typeof email !== 'string') {
    return res.json(generic);
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      const token = crypto.randomUUID();
      const exp = new Date(Date.now() + 60 * 60 * 1000); // 1 ora
      await prisma.user.update({
        where: { id: user.id },
        data: { resetToken: token, resetTokenExp: exp },
      });
      // TODO: invio email — per ora log a console.
      console.log(`[password-reset] link per ${user.email}: ${buildResetLink(token)}`);
    }
  } catch (err) {
    console.error('forgot-password error:', err);
    // Continua con risposta generica anche in caso di errore (no info leak).
  }

  res.json(generic);
});

// POST /api/auth/reset-password — accetta { token, newPassword }
router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body || {};

  if (!token || !newPassword) {
    return res.status(400).json({ error: 'Token e nuova password obbligatori' });
  }
  if (typeof newPassword !== 'string' || newPassword.length < 8) {
    return res.status(400).json({ error: 'La password deve avere almeno 8 caratteri' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { resetToken: token } });
    if (!user || !user.resetTokenExp || user.resetTokenExp < new Date()) {
      return res.status(400).json({ error: 'Token non valido o scaduto' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExp: null,
      },
    });

    res.json({ message: 'Password aggiornata. Ora puoi accedere.' });
  } catch (err) {
    console.error('reset-password error:', err);
    res.status(500).json({ error: 'Errore durante il reset della password' });
  }
});

module.exports = router;
