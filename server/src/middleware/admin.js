// requireAdmin va in catena DOPO requireAuth (che popola req.user dal JWT).
// Gate basato sul flag User.isAdmin nel DB: niente più header/token separato.
function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Autenticazione richiesta' });
  }
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: 'Accesso admin richiesto' });
  }
  next();
}

module.exports = { requireAdmin };
