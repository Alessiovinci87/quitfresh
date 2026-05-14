const crypto = require('crypto');

function requireAdmin(req, res, next) {
  const expected = (process.env.ADMIN_TOKEN || '').trim();
  if (!expected) {
    return res.status(503).json({ error: 'Admin disattivato (ADMIN_TOKEN non configurato)' });
  }
  const provided = (req.header('x-admin-token') || '').trim();
  if (!provided) {
    return res.status(401).json({ error: 'Token admin mancante' });
  }
  // timingSafeEqual richiede buffer della stessa lunghezza: pad o reject.
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(401).json({ error: 'Token admin non valido' });
  }
  next();
}

module.exports = { requireAdmin };
