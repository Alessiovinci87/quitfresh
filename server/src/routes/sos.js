const router = require('express').Router();
const prisma = require('../lib/prisma');
const { requireAuth, requireVerifiedEmail } = require('../middleware/auth');
const { selectPhrases, markUsed } = require('../lib/cognitiveSelector');

const ACTION_TYPES = new Set([
  'water', 'teeth', 'squats', 'walk', 'gum',
  'cold', 'breath', 'call', 'snack',
  'cognitive',
  'custom',
]);

const ALLOWED_INTENSITIES = new Set(['bassa', 'media', 'alta', 'emergenza']);

// Inferisce trigger_context per SOS da ora + criticalMoments dichiarati.
function inferSosTrigger(hour, criticalMoments = []) {
  const cm = (criticalMoments || []).map((m) => (m || '').toLowerCase());
  const has = (kw) => cm.some((m) => m.includes(kw));

  if (hour >= 6 && hour < 10) return 'mattino';
  if (hour >= 10 && hour < 12 && has('caff')) return 'caffè';
  if (hour >= 12 && hour < 15 && has('pranz')) return 'dopo pranzo';
  if (hour >= 15 && hour < 18) return 'pausa lavoro';
  if (hour >= 18 && hour < 21 && has('cen')) return 'dopo cena';
  if (hour >= 21 && hour < 24) return 'dopo cena';
  if (hour >= 0 && hour < 4) return 'sera tardi';
  if (has('stress')) return 'stress';
  if (has('guida') || has('auto') || has('macchina')) return 'guida';
  if (has('amici') || has('compagn') || has('social')) return 'socialità';
  return null;
}

// SOS Craving e' una feature di retention FREE (no AI = no costi marginali).
// Niente requirePremium qui.
router.use(requireAuth, requireVerifiedEmail);

// POST /api/sos/sessions
// Body: { intensityBefore, intensityAfter, type }
// Crea la sessione e incrementa User.cravingsBattled in una transazione.
router.post('/sessions', async (req, res) => {
  const { intensityBefore, intensityAfter, type } = req.body;

  const before = parseInt(intensityBefore, 10);
  const after = intensityAfter == null ? null : parseInt(intensityAfter, 10);

  if (!Number.isFinite(before) || before < 0 || before > 10) {
    return res.status(400).json({ error: 'intensityBefore deve essere 0-10' });
  }
  if (after != null && (!Number.isFinite(after) || after < 0 || after > 10)) {
    return res.status(400).json({ error: 'intensityAfter deve essere 0-10' });
  }
  if (!ACTION_TYPES.has(type)) {
    return res.status(400).json({ error: 'type non valido' });
  }

  try {
    const [session, user] = await prisma.$transaction([
      prisma.cravingSession.create({
        data: {
          userId: req.user.id,
          intensityBefore: before,
          intensityAfter: after,
          type,
        },
      }),
      prisma.user.update({
        where: { id: req.user.id },
        data: { cravingsBattled: { increment: 1 } },
        select: { cravingsBattled: true },
      }),
    ]);

    res.json({ session, cravingsBattled: user.cravingsBattled });
  } catch (err) {
    console.error('SOS session error:', err);
    res.status(500).json({ error: 'Errore durante il salvataggio della sessione' });
  }
});

// GET /api/sos/stats — counter + delta medio + ultime 10 sessioni
router.get('/stats', async (req, res) => {
  try {
    const [user, recent] = await Promise.all([
      prisma.user.findUnique({
        where: { id: req.user.id },
        select: { cravingsBattled: true },
      }),
      prisma.cravingSession.findMany({
        where: { userId: req.user.id, intensityAfter: { not: null } },
        orderBy: { completedAt: 'desc' },
        take: 10,
      }),
    ]);

    const deltas = recent.map(s => s.intensityBefore - s.intensityAfter);
    const avgDelta = deltas.length
      ? deltas.reduce((a, b) => a + b, 0) / deltas.length
      : 0;

    res.json({
      cravingsBattled: user?.cravingsBattled || 0,
      avgDelta: Math.round(avgDelta * 10) / 10,
      recent,
    });
  } catch (err) {
    console.error('SOS stats error:', err);
    res.status(500).json({ error: 'Errore stats' });
  }
});

// GET /api/sos/phrases?intensity=alta&count=3
// Restituisce frasi cognitive per il carosello SOS.
router.get('/phrases', async (req, res) => {
  const intensity = ALLOWED_INTENSITIES.has(req.query.intensity) ? req.query.intensity : 'alta';
  const count = Math.max(1, Math.min(5, parseInt(req.query.count, 10) || 3));

  try {
    // Fetch criticalMoments dell'utente per inferenza trigger.
    const userRow = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { criticalMoments: true },
    });
    const hour = new Date().getHours();
    const trigger = inferSosTrigger(hour, userRow?.criticalMoments || []);

    const ctx = {
      best_usage: 'SOS',
      craving_phase: 'picco',
      processing_state: 'crisis_compatible',
      intensity,
      ...(trigger ? { trigger_context: trigger } : {}),
    };

    let phrases = await selectPhrases(ctx, count + 2, { userId: req.user.id });
    // Filtra per delivery_mode che include standalone o sequence (no follow-up chat).
    phrases = phrases.filter((p) => {
      const dm = p.delivery_mode || [];
      return dm.includes('standalone') || dm.includes('sequence');
    });
    phrases = phrases.slice(0, count);

    for (const p of phrases) {
      markUsed(req.user.id, p.id, { context: 'sos' }).catch(() => {});
    }

    res.json({
      phrases: phrases.map((p) => ({
        id: p.id,
        text: p.text,
        mental_effect: p.mental_effect || [],
      })),
    });
  } catch (err) {
    console.error('SOS phrases error:', err);
    res.status(500).json({ error: 'Errore caricamento frasi' });
  }
});

module.exports = router;
