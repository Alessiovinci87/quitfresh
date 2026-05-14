const router = require('express').Router();
const crypto = require('crypto');
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');

router.use(requireAuth, requireAdmin);

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // niente I/O/0/1 per leggibilità

function generateCode(length = 8) {
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return out;
}

function statusOf(promo) {
  if (!promo.active) return 'inactive';
  if (promo.expiresAt && new Date(promo.expiresAt) < new Date()) return 'expired';
  if (promo.maxUses != null && promo.usageCount >= promo.maxUses) return 'exhausted';
  return 'available';
}

function serialize(promo) {
  return { ...promo, status: statusOf(promo) };
}

// POST /api/admin/promo-codes
// body: { code?, discountPct, maxUses?, expiresAt?, notes? }
router.post('/promo-codes', async (req, res) => {
  let { code, discountPct, maxUses, expiresAt, notes } = req.body || {};

  const pct = parseInt(discountPct);
  if (!Number.isFinite(pct) || pct < 1 || pct > 100) {
    return res.status(400).json({ error: 'discountPct deve essere tra 1 e 100' });
  }

  let normalizedCode;
  if (code) {
    normalizedCode = String(code).trim().toUpperCase();
    if (!/^[A-Z0-9]{3,32}$/.test(normalizedCode)) {
      return res.status(400).json({ error: 'Codice non valido (3-32 caratteri A-Z 0-9)' });
    }
    const existing = await prisma.promoCode.findUnique({ where: { code: normalizedCode } });
    if (existing) return res.status(409).json({ error: 'Codice già esistente' });
  } else {
    // Genera codice univoco con retry su collisione (improbabile ma possibile).
    for (let i = 0; i < 5; i++) {
      const candidate = generateCode(8);
      const exists = await prisma.promoCode.findUnique({ where: { code: candidate } });
      if (!exists) { normalizedCode = candidate; break; }
    }
    if (!normalizedCode) return res.status(500).json({ error: 'Impossibile generare un codice univoco' });
  }

  const data = {
    code: normalizedCode,
    discountPct: pct,
    maxUses: maxUses === null ? null : (maxUses === undefined ? 1 : parseInt(maxUses)),
    expiresAt: expiresAt ? new Date(expiresAt) : null,
    notes: notes ? String(notes).slice(0, 500) : null,
  };

  if (data.maxUses != null && (!Number.isFinite(data.maxUses) || data.maxUses < 1)) {
    return res.status(400).json({ error: 'maxUses deve essere null o un intero >= 1' });
  }
  if (data.expiresAt && Number.isNaN(data.expiresAt.getTime())) {
    return res.status(400).json({ error: 'expiresAt non è una data valida' });
  }

  const promo = await prisma.promoCode.create({ data });
  res.status(201).json(serialize(promo));
});

// GET /api/admin/promo-codes
router.get('/promo-codes', async (_req, res) => {
  const promos = await prisma.promoCode.findMany({ orderBy: { createdAt: 'desc' } });
  res.json(promos.map(serialize));
});

// PATCH /api/admin/promo-codes/:id
router.patch('/promo-codes/:id', async (req, res) => {
  const { active, maxUses, expiresAt, notes } = req.body || {};
  const data = {};
  if (active !== undefined) data.active = Boolean(active);
  if (maxUses !== undefined) {
    data.maxUses = maxUses === null ? null : parseInt(maxUses);
    if (data.maxUses != null && (!Number.isFinite(data.maxUses) || data.maxUses < 1)) {
      return res.status(400).json({ error: 'maxUses deve essere null o un intero >= 1' });
    }
  }
  if (expiresAt !== undefined) {
    data.expiresAt = expiresAt ? new Date(expiresAt) : null;
    if (data.expiresAt && Number.isNaN(data.expiresAt.getTime())) {
      return res.status(400).json({ error: 'expiresAt non è una data valida' });
    }
  }
  if (notes !== undefined) data.notes = notes ? String(notes).slice(0, 500) : null;

  try {
    const promo = await prisma.promoCode.update({ where: { id: req.params.id }, data });
    res.json(serialize(promo));
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Codice non trovato' });
    throw err;
  }
});

// DELETE /api/admin/promo-codes/:id — solo se mai usato; altrimenti suggerisce active:false
router.delete('/promo-codes/:id', async (req, res) => {
  const promo = await prisma.promoCode.findUnique({ where: { id: req.params.id } });
  if (!promo) return res.status(404).json({ error: 'Codice non trovato' });
  if (promo.usageCount > 0) {
    return res.status(409).json({
      error: 'Codice già usato — disattivalo invece di cancellarlo (PATCH con active:false)',
    });
  }
  await prisma.promoCode.delete({ where: { id: promo.id } });
  res.status(204).end();
});

module.exports = router;
