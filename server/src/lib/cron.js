const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const { sendPush, isEnabled } = require('./push');

const prisma = new PrismaClient();

const MESSAGES = [
  { title: 'QuitFresh', body: 'È uno dei tuoi momenti critici. Come stai? Sono qui se hai bisogno.' },
  { title: 'QuitFresh', body: 'Hai segnato questo orario come delicato. Ricorda: il craving dura al massimo 5 minuti.' },
  { title: 'QuitFresh', body: 'Check-in del momento difficile. Apri l\'app se senti qualcosa.' },
  { title: 'QuitFresh', body: 'Sei ancora qui. Questo orario è nel tuo radar — gestiscilo con calma.' },
];

function randomMessage() {
  return MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
}

function startCron() {
  if (!isEnabled()) return;

  // ogni minuto controlla se qualche utente ha un promemoria adesso
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
        const msg = randomMessage();
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
