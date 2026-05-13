const cron = require('node-cron');
const prisma = require('./prisma');
const { sendPush, isEnabled } = require('./push');
const { getActivePhase, getDoseTimes } = require('./cytisine');

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
      // 1. Promemoria citisina (schedule personalizzato con fallback al default).
      // Filtri:
      //   - cytisineStartDate negli ultimi 60 giorni (oltre il protocollo finisce)
      //   - almeno una pushSubscription attiva (senza, dispatch sarebbe no-op)
      const sixtyDaysAgo = new Date(Date.now() - 60 * 86400000);
      const cytisineUsers = await prisma.user.findMany({
        where: {
          cytisineStartDate: { not: null, gte: sixtyDaysAgo },
          pushSubscriptions: { some: {} },
        },
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

      // 2. Promemoria anti-craving manuali — filtra per orario corrente + push attivi
      const cravingUsers = await prisma.user.findMany({
        where: {
          notificationTimes: { has: timeStr },
          pushSubscriptions: { some: {} },
        },
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

  // Data retention: ogni 1° del mese alle 03:00 Europe/Rome cancella i dati
  // degli utenti inattivi da 12+ mesi (account creato 12+ mesi fa E nessun
  // DiaryEntry/CravingLog negli ultimi 12 mesi). L'account utente NON viene
  // cancellato — quella è azione esplicita dell'utente.
  cron.schedule('0 3 1 * *', async () => {
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    try {
      const candidates = await prisma.user.findMany({
        where: {
          createdAt: { lt: twelveMonthsAgo },
          diaryEntries: { none: { date: { gte: twelveMonthsAgo } } },
          cravingLogs: { none: { timestamp: { gte: twelveMonthsAgo } } },
        },
        select: { id: true },
      });

      let cleaned = 0;
      for (const { id } of candidates) {
        await prisma.$transaction([
          prisma.cravingLog.deleteMany({ where: { userId: id } }),
          prisma.diaryEntry.deleteMany({ where: { userId: id } }),
          prisma.quitAttempt.deleteMany({ where: { userId: id } }),
          prisma.pushSubscription.deleteMany({ where: { userId: id } }),
        ]);
        cleaned++;
      }
      console.log(`[retention] dati ripuliti per ${cleaned} utenti inattivi`);
    } catch (err) {
      console.error('[retention] errore:', err.message);
    }
  }, { timezone: 'Europe/Rome' });

  console.log('[cron] scheduler notifiche avviato');
}

module.exports = { startCron };
