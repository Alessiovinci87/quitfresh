const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const { sendPush, isEnabled } = require('./push');

const prisma = new PrismaClient();

const CYTISINE_PHASES = [
  { maxDay: 3,  pills: 6, interval: '2 ore' },
  { maxDay: 12, pills: 5, interval: '2,5 ore' },
  { maxDay: 16, pills: 4, interval: '3 ore' },
  { maxDay: 20, pills: 3, interval: '5 ore' },
  { maxDay: 25, pills: '1-2', interval: 'al giorno' },
];

const CRAVING_MESSAGES = [
  'È uno dei tuoi momenti critici. Come stai? Sono qui se hai bisogno.',
  'Hai segnato questo orario come delicato. Ricorda: il craving dura al massimo 5 minuti.',
  'Check-in del momento difficile. Apri l\'app se senti qualcosa.',
  'Sei ancora qui. Questo orario è nel tuo radar — gestiscilo con calma.',
];

function buildMessage(user) {
  if (user.cytisineStartDate) {
    const dayNum = Math.floor((Date.now() - new Date(user.cytisineStartDate)) / 86400000) + 1;
    if (dayNum >= 1 && dayNum <= 25) {
      const phase = CYTISINE_PHASES.find(p => dayNum <= p.maxDay);
      if (phase) {
        return {
          title: `QuitFresh · Giorno ${dayNum}`,
          body: `Prendi la citisina! ${phase.pills} cps al dì, 1 ogni ${phase.interval}.`,
        };
      }
    }
  }
  return {
    title: 'QuitFresh',
    body: CRAVING_MESSAGES[Math.floor(Math.random() * CRAVING_MESSAGES.length)],
  };
}

function startCron() {
  if (!isEnabled()) return;

  cron.schedule('* * * * *', async () => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const timeStr = `${hh}:${mm}`;

    try {
      const users = await prisma.user.findMany({
        where: { notificationTimes: { has: timeStr } },
        include: { pushSubscriptions: true },
      });

      for (const user of users) {
        const msg = buildMessage(user);
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
    } catch (err) {
      console.error('[cron] errore:', err.message);
    }
  });

  console.log('[cron] scheduler notifiche avviato');
}

module.exports = { startCron };
