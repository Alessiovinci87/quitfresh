const router = require('express').Router();
const prisma = require('../lib/prisma');
const { requireAuth, requireVerifiedEmail } = require('../middleware/auth');

// L'endpoint resta aperto (anche utenti free): la Home usa /api/diary per
// segnare le capsule citisina di oggi, feature inclusa nel free. La pagina
// /diary (note giornaliere) rimane gated lato client via PrivateRoute.
router.use(requireAuth, requireVerifiedEmail);

function dayStart(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

// GET /api/diary — ultimi 30 giorni
router.get('/', async (req, res) => {
  try {
    const entries = await prisma.diaryEntry.findMany({
      where: { userId: req.user.id },
      orderBy: { date: 'desc' },
      take: 30,
    });
    res.json(entries);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore nel recupero del diario' });
  }
});

// POST /api/diary — crea o aggiorna l'entry di oggi
router.post('/', async (req, res) => {
  const { date, pillsTaken, cigarettesToday, sideEffects, notes } = req.body;

  if (pillsTaken === undefined) {
    return res.status(400).json({ error: 'pillsTaken è obbligatorio' });
  }
  // Validation hardening: range + length limits per evitare DB pollution
  // o payload anomali.
  const pills = parseInt(pillsTaken);
  if (!Number.isFinite(pills) || pills < 0 || pills > 20) {
    return res.status(400).json({ error: 'pillsTaken fuori range (0-20)' });
  }
  const cigs = parseInt(cigarettesToday ?? 0);
  if (!Number.isFinite(cigs) || cigs < 0 || cigs > 200) {
    return res.status(400).json({ error: 'cigarettesToday fuori range (0-200)' });
  }
  const safeSideEffects = Array.isArray(sideEffects)
    ? sideEffects.filter(s => typeof s === 'string' && s.length <= 100).slice(0, 20)
    : [];
  const safeNotes = typeof notes === 'string' ? notes.slice(0, 2000) : '';

  try {
    const entryDate = dayStart(date || new Date());

    const entry = await prisma.diaryEntry.upsert({
      where: { userId_date: { userId: req.user.id, date: entryDate } },
      update: {
        pillsTaken: pills,
        cigarettesToday: cigs,
        sideEffects: safeSideEffects,
        notes: safeNotes,
      },
      create: {
        userId: req.user.id,
        date: entryDate,
        pillsTaken: pills,
        cigarettesToday: cigs,
        sideEffects: safeSideEffects,
        notes: safeNotes,
      },
    });
    res.json(entry);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore nel salvataggio del diario' });
  }
});

// PATCH /api/diary/cigs — aggiorna solo le sigarette del giorno
router.patch('/cigs', async (req, res) => {
  const { date, cigarettes } = req.body;
  if (cigarettes === undefined) return res.status(400).json({ error: 'cigarettes obbligatorio' });

  const entryDate = dayStart(date || new Date());
  try {
    const entry = await prisma.diaryEntry.upsert({
      where: { userId_date: { userId: req.user.id, date: entryDate } },
      update: { cigarettesToday: Math.max(0, parseInt(cigarettes)) },
      create: {
        userId: req.user.id,
        date: entryDate,
        cigarettesToday: Math.max(0, parseInt(cigarettes)),
        pillsTaken: 0,
        sideEffects: [],
        notes: '',
      },
    });
    res.json(entry);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore aggiornamento sigarette' });
  }
});

module.exports = router;
