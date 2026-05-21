// Seed account demo per gli screenshot landing (quitfresh.com).
// Idempotente (upsert su email). NON usare per QA reale — il flag isPremium
// e' impostato a true direttamente nel DB, bypassando Stripe.
//
// Uso:
//   cd server
//   DATABASE_URL=... DEMO_PASSWORD=segreta node scripts/seed-demo.js
//
// In Railway: railway run --service=quitfresh node scripts/seed-demo.js
// (eredita DATABASE_URL dall'ambiente del service)

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const DEMO_EMAIL = process.env.DEMO_EMAIL || 'demo@quitfresh.it';
const DEMO_PASSWORD = process.env.DEMO_PASSWORD;

if (!DEMO_PASSWORD || DEMO_PASSWORD.length < 8) {
  console.error('FATAL: DEMO_PASSWORD mancante o < 8 caratteri.');
  console.error('Esempio: DEMO_PASSWORD=quitfresh-demo-2026 node scripts/seed-demo.js');
  process.exit(1);
}

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  // Quit date 12 giorni fa: numeri del contatore ben visibili
  const quitDate = new Date();
  quitDate.setDate(quitDate.getDate() - 12);

  // Citisina iniziata insieme al quit (giorno 12 del protocollo Sopharma)
  const cytisineStartDate = new Date(quitDate);

  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {
      passwordHash,
      cigarettesPerDay: 20,
      cigarettePackPrice: 6.20,
      criticalMoments: ['Caffè', 'Stress', 'Pausa lavoro', 'Dopo i pasti'],
      dependencyLevel: 4,
      quitDate,
      smokeFreeSince: quitDate,
      cytisineStartDate,
      firstDoseTime: '08:00',
      quitReasons: ['Salute', 'Mia figlia', 'Soldi', 'Fiato per correre'],
      cravingsBattled: 7,
      isPremium: true,
      premiumSince: quitDate,
      emailVerified: true,
    },
    create: {
      email: DEMO_EMAIL,
      passwordHash,
      cigarettesPerDay: 20,
      cigarettePackPrice: 6.20,
      criticalMoments: ['Caffè', 'Stress', 'Pausa lavoro', 'Dopo i pasti'],
      dependencyLevel: 4,
      quitDate,
      smokeFreeSince: quitDate,
      cytisineStartDate,
      firstDoseTime: '08:00',
      quitReasons: ['Salute', 'Mia figlia', 'Soldi', 'Fiato per correre'],
      cravingsBattled: 7,
      isPremium: true,
      premiumSince: quitDate,
      emailVerified: true,
    },
  });

  // Reset craving sessions e re-seed con dati plausibili per la pagina Stats
  await prisma.cravingSession.deleteMany({ where: { userId: user.id } });
  const sessions = [];
  for (let i = 0; i < 7; i++) {
    const completedAt = new Date(Date.now() - (i * 36 + Math.random() * 8) * 3600000);
    const before = 5 + Math.floor(Math.random() * 5); // 5-9
    const after = Math.max(1, before - 2 - Math.floor(Math.random() * 3));
    sessions.push({
      userId: user.id,
      intensityBefore: before,
      intensityAfter: after,
      type: ['water', 'breath', 'walk', 'gum', 'teeth'][i % 5],
      completedAt,
    });
  }
  await prisma.cravingSession.createMany({ data: sessions });

  console.log('---');
  console.log('Demo user pronto:');
  console.log('  email:    ' + DEMO_EMAIL);
  console.log('  password: ' + DEMO_PASSWORD);
  console.log('  premium:  true');
  console.log('  quit:     ' + quitDate.toISOString().slice(0, 10) + ' (12 giorni fa)');
  console.log('  sessioni SOS: ' + sessions.length);
  console.log('---');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
