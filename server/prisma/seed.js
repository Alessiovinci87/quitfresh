const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10);

  const quitDate = new Date();
  quitDate.setDate(quitDate.getDate() - 7);

  const user = await prisma.user.upsert({
    where: { email: 'test@quitfresh.app' },
    update: {},
    create: {
      email: 'test@quitfresh.app',
      passwordHash,
      cigarettesPerDay: 15,
      criticalMoments: ['caffè', 'stress', 'pausa lavoro', 'dopo i pasti'],
      dependencyLevel: 3,
      quitDate,
    },
  });

  await prisma.cravingLog.createMany({
    data: [
      { userId: user.id, context: 'pausa caffè in ufficio', resolved: true },
      { userId: user.id, context: 'riunione stressante', resolved: true },
      { userId: user.id, context: '', resolved: false },
    ],
    skipDuplicates: true,
  });

  console.log(`Utente di test creato: ${user.email}`);
  console.log('Password: password123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
