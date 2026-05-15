const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token mancante o non valido' });
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
      return res.status(401).json({ error: 'Utente non trovato' });
    }
    // TOKEN REVOCATION CHECK: payload.tv === user.tokenVersion. Se
    // differiscono, il token e' stato revocato (reset password, logout-all).
    // Token vecchi/rubati non funzionano piu' dopo l'increment di tokenVersion.
    if ((payload.tv ?? 0) !== (user.tokenVersion ?? 0)) {
      return res.status(401).json({ error: 'Sessione revocata. Esegui di nuovo il login.' });
    }
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Token non valido o scaduto' });
  }
}

// Middleware che blocca route protette se l'email dell'utente non e'
// verificata. Va DOPO requireAuth nella catena (richiede req.user).
// Le route auth (/api/auth/*) NON applicano questo middleware: l'utente
// deve poter accedere a /me per leggere il proprio stato, a /verify-email
// per cliccare il link, a /resend-verify per richiedere reinvio.
// Client riconosce code:'EMAIL_NOT_VERIFIED' per mostrare il banner verifica.
function requireVerifiedEmail(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Autenticazione richiesta' });
  }
  if (!req.user.emailVerified) {
    return res.status(403).json({
      error: 'Email non verificata. Controlla la casella di posta.',
      code: 'EMAIL_NOT_VERIFIED',
    });
  }
  next();
}

module.exports = { requireAuth, requireVerifiedEmail };
