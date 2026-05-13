const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const SEED_CODES = [
  { code: 'DOTTORESSA', discountPct: 30 },
  { code: 'FARMACISTA', discountPct: 30 },
  { code: 'QUITFRESH',  discountPct: 10 },
];

async function ensurePromoCodes() {
  for (const { code, discountPct } of SEED_CODES) {
    await prisma.promoCode.upsert({
      where: { code },
      update: { discountPct, active: true },
      create: { code, discountPct, active: true },
    });
  }
  console.log(`[promo] ${SEED_CODES.length} codici sincronizzati`);
}

module.exports = { ensurePromoCodes };
