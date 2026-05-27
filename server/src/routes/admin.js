const router = require('express').Router();
const crypto = require('crypto');
const prisma = require('../lib/prisma');
const { requireAuth, requireVerifiedEmail } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');
const { runScheduledBackup } = require('../lib/backup');
const { sendActivateNotificationsEmail, sendVerifyEmail, isEnabled: emailEnabled } = require('../lib/email');

router.use(requireAuth, requireVerifiedEmail, requireAdmin);

// Sub-router analytics — montato qui per ereditare middleware admin.
router.use('/analytics', require('./adminAnalytics'));

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

// POST /api/admin/backup — trigger manuale del backup DB (admin-only).
// Risponde 202 subito e fa il dump in background per evitare timeout HTTP
// se il dump è grande. L'admin riceve l'email di conferma poco dopo.
router.post('/backup', (req, res) => {
  res.status(202).json({
    ok: true,
    message: 'Backup in corso. Riceverai l\'email tra qualche istante.',
  });

  runScheduledBackup({ trigger: 'manual' })
    .then((result) => {
      console.log('[admin] backup manuale completato:', result);
    })
    .catch((err) => {
      console.error('[admin] backup manuale fallito:', err.message);
    });
});

// Risolve i destinatari del broadcast a partire dal body.
// - userIds: array → solo quegli utenti (devono avere un'email).
// - altrimenti default: email verificata + nessuna push subscription.
async function resolveBroadcastRecipients(body) {
  const ids = Array.isArray(body?.userIds) ? body.userIds.filter(Boolean) : null;
  if (ids && ids.length > 0) {
    return prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, email: true },
    });
  }
  return prisma.user.findMany({
    where: { emailVerified: true, pushSubscriptions: { none: {} } },
    select: { id: true, email: true },
  });
}

// Valida un codice promo per l'allegato in mail. Ritorna { code, discountPct,
// expiresAt } se utilizzabile, altrimenti lancia con messaggio chiaro.
async function resolvePromoForEmail(rawCode) {
  const code = String(rawCode).trim().toUpperCase();
  const promo = await prisma.promoCode.findUnique({ where: { code } });
  if (!promo) throw new Error(`Codice "${code}" inesistente`);
  if (statusOf(promo) !== 'available') {
    throw new Error(`Codice "${code}" non utilizzabile (stato: ${statusOf(promo)})`);
  }
  return { code: promo.code, discountPct: promo.discountPct, expiresAt: promo.expiresAt };
}

// POST /api/admin/broadcast-notifiche
// Invita gli utenti ad attivare le notifiche dal Profilo. Canale email (la
// push non li raggiunge). Opzionalmente allega un codice sconto come bonus.
//
// Body:
//   confirm:  true → invia davvero. Senza → dry-run (conta + anteprima, NON invia).
//   userIds:  array opzionale di id utente. Se omesso/vuoto → default
//             (verificati senza push subscription).
//   promoCode: stringa opzionale. Se presente, validato e allegato in mail.
//
// L'invio reale risponde 202 e procede in background con un delay tra le mail
// per rispettare i rate limit di Resend.
router.post('/broadcast-notifiche', async (req, res) => {
  const confirm = Boolean(req.body?.confirm);

  // Risolvi promo (se richiesto) prima di tutto, così un codice errato blocca
  // anche il dry-run con un messaggio chiaro.
  let promo = null;
  if (req.body?.promoCode) {
    try {
      promo = await resolvePromoForEmail(req.body.promoCode);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  }

  const recipients = await resolveBroadcastRecipients(req.body);

  if (!confirm) {
    return res.json({
      dryRun: true,
      count: recipients.length,
      emailEnabled: emailEnabled(),
      promo,
      sample: recipients.slice(0, 10).map((u) => u.email),
      message: `Dry-run: ${recipients.length} destinatari${promo ? ` · codice ${promo.code} (−${promo.discountPct}%)` : ''}. Rilancia con confirm:true per inviare.`,
    });
  }

  if (!emailEnabled()) {
    return res.status(503).json({ error: 'Resend non configurato (RESEND_API_KEY / RESEND_FROM_EMAIL mancanti)' });
  }
  if (recipients.length === 0) {
    return res.status(400).json({ error: 'Nessun destinatario selezionato' });
  }

  res.status(202).json({
    ok: true,
    count: recipients.length,
    promo,
    message: `Invio avviato verso ${recipients.length} destinatari. Procede in background.`,
  });

  // Invio sequenziale con delay per non sforare i rate limit di Resend.
  (async () => {
    let sent = 0;
    let failed = 0;
    for (const u of recipients) {
      if (!u.email) { failed++; continue; }
      try {
        const result = await sendActivateNotificationsEmail(u.email, { promo });
        if (result?.error) failed++;
        else sent++;
      } catch (err) {
        failed++;
        console.error(`[admin] broadcast-notifiche errore → ${u.email}:`, err.message);
      }
      await new Promise((r) => setTimeout(r, 600));
    }
    console.log(`[admin] broadcast-notifiche completato: ${sent} inviate, ${failed} fallite su ${recipients.length}`);
  })();
});

// Costruisce il link di verifica email (stessa logica di auth.js).
function buildVerifyLink(token) {
  const base = (process.env.CLIENT_BASE_URL || 'http://localhost:5173').replace(/\/$/, '');
  return `${base}/verify-email?token=${token}`;
}

// POST /api/admin/broadcast-verify
// Ricorda agli utenti con email NON verificata di completare la verifica.
// Riusa la mail di verifica esistente, rigenerando il link per ciascuno.
//
// Body:
//   confirm: true → invia davvero. Senza → dry-run (conta + anteprima).
//   userIds: array opzionale. Se omesso/vuoto → default (tutti i non verificati).
//
// Per sicurezza salta chi risulta gia' verificato anche se passato in userIds.
router.post('/broadcast-verify', async (req, res) => {
  const confirm = Boolean(req.body?.confirm);
  const ids = Array.isArray(req.body?.userIds) ? req.body.userIds.filter(Boolean) : null;

  const where = { emailVerified: false };
  if (ids && ids.length > 0) where.id = { in: ids };

  const recipients = await prisma.user.findMany({
    where,
    select: { id: true, email: true, verifyToken: true },
  });

  if (!confirm) {
    return res.json({
      dryRun: true,
      count: recipients.length,
      emailEnabled: emailEnabled(),
      sample: recipients.slice(0, 10).map((u) => u.email),
      message: `Dry-run: ${recipients.length} utenti non verificati. Rilancia con confirm:true per inviare.`,
    });
  }

  if (!emailEnabled()) {
    return res.status(503).json({ error: 'Resend non configurato (RESEND_API_KEY / RESEND_FROM_EMAIL mancanti)' });
  }
  if (recipients.length === 0) {
    return res.status(400).json({ error: 'Nessun destinatario non verificato selezionato' });
  }

  res.status(202).json({
    ok: true,
    count: recipients.length,
    message: `Invio promemoria verifica avviato verso ${recipients.length} utenti. Procede in background.`,
  });

  (async () => {
    let sent = 0;
    let failed = 0;
    for (const u of recipients) {
      if (!u.email) { failed++; continue; }
      try {
        // Garantisci un token valido: se mancante (improbabile per i non
        // verificati) ne generiamo uno nuovo e lo persistiamo.
        let token = u.verifyToken;
        if (!token) {
          token = crypto.randomUUID();
          await prisma.user.update({ where: { id: u.id }, data: { verifyToken: token } });
        }
        const result = await sendVerifyEmail(u.email, buildVerifyLink(token));
        if (result?.error) failed++;
        else sent++;
      } catch (err) {
        failed++;
        console.error(`[admin] broadcast-verify errore → ${u.email}:`, err.message);
      }
      await new Promise((r) => setTimeout(r, 600));
    }
    console.log(`[admin] broadcast-verify completato: ${sent} inviate, ${failed} fallite su ${recipients.length}`);
  })();
});

module.exports = router;
