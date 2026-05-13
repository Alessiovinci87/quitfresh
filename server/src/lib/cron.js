const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const { sendPush, isEnabled } = require('./push');
const { getActivePhase, getDoseTimes } = require('./cytisine');

const prisma = new PrismaClient();

function getRomeTime() {
  const romeDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Rome' }));
  return {
    timeStr: `${String(romeDate.getHours()).padStart(2, '0')}:${String(romeDate.getMinutes()).padStart(2, '0')}`,
    date: romeDate,
  };
}

const CRAVING_MESSAGES = [
  'È uno dei tuoi momenti critici. Come stai? Sono qui se hai bisogno.',
  'Hai segnato questo orario come delicato. Ricorda: il craving dura al massimo 5 minuti.',
  'Check-in del momento difficile. Apri l\'app se senti qualcosa.',
  'Sei ancora qui. Gestisci questo orario con calma.',
];

async function dispatchToUser(user, msg) {
  for (const sub of user.pushSubscriptions) {
    const result = await sendPush(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      msg
    );
    if (result === 'expired') {
      await prisma.pushSubscription.delete({ where: { endpoint: sub.endpoint } }).catch(() => {});
    }
  }
}

function startCron() {
  if (!isEnabled()) return;

  cron.schedule('* * * * *', async () => {
    const { timeStr, date: romeNow } = getRomeTime();

    try {
      // 1. Promemoria citisina (schedule personalizzato con fallback al default)
      const cytisineUsers = await prisma.user.findMany({
        where: { cytisineStartDate: { not: null }, firstDoseTime: { not: null } },
        include: { pushSubscriptions: true },
      });

      for (const user of cytisineUsers) {
        const start = new Date(new Date(user.cytisineStartDate).toLocaleString('en-US', { timeZone: 'Europe/Rome' }));
        const phase = getActivePhase(user.cytisineSchedule, start, romeNow);
        if (!phase) continue;

        const doseTimes = getDoseTimes(user.firstDoseTime, phase);
        const doseIndex = doseTimes.indexOf(timeStr);
        if (doseIndex === -1) continue;

        await dispatchToUser(user, {
          title: `QuitFresh · Giorno ${phase.day}`,
          body: `Capsula ${doseIndex + 1} di ${phase.pills} · Fase ${phase.index + 1}. Prendila ora!`,
        });
      }

      // 2. Promemoria anti-craving manuali
      const cravingUsers = await prisma.user.findMany({
        where: { notificationTimes: { has: timeStr } },
        include: { pushSubscriptions: true },
      });

      for (const user of cravingUsers) {
        await dispatchToUser(user, {
          title: 'QuitFresh',
          body: CRAVING_MESSAGES[Math.floor(Math.random() * CRAVING_MESSAGES.length)],
        });
      }
    } catch (err) {
      console.error('[cron] errore:', err.message);
    }
  });

  console.log('[cron] scheduler notifiche avviato');
}

module.exports = { startCron };
