const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const { sendPush, isEnabled } = require('./push');

const prisma = new PrismaClient();

const CYTISINE_PHASES = [
  { maxDay: 3,  label: 'Fase 1 (gg 1–3)',   pills: 6, intervalMin: 120 },
  { maxDay: 12, label: 'Fase 2 (gg 4–12)',  pills: 5, intervalMin: 150 },
  { maxDay: 16, label: 'Fase 3 (gg 13–16)', pills: 4, intervalMin: 180 },
  { maxDay: 20, label: 'Fase 4 (gg 17–20)', pills: 3, intervalMin: 300 },
  { maxDay: 25, label: 'Fase 5 (gg 21–25)', pills: 1, intervalMin: 0   },
];

function getRomeTime() {
  const romeDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Rome' }));
  return {
    timeStr: `${String(romeDate.getHours()).padStart(2, '0')}:${String(romeDate.getMinutes()).padStart(2, '0')}`,
    date: romeDate,
  };
}

function getPhase(startDate) {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Rome' }));
  const start = new Date(new Date(startDate).toLocaleString('en-US', { timeZone: 'Europe/Rome' }));
  const day = Math.floor((now - start) / 86400000) + 1;
  if (day < 1 || day > 25) return null;
  const phase = CYTISINE_PHASES.find(p => day <= p.maxDay);
  return phase ? { day, ...phase } : null;
}

function getDoseTimes(firstDoseTime, phase) {
  const [h, m] = firstDoseTime.split(':').map(Number);
  const firstMin = h * 60 + m;
  const times = [];
  for (let i = 0; i < phase.pills; i++) {
    const total = firstMin + i * phase.intervalMin;
    if (total >= 1440) break;
    const hh = String(Math.floor(total / 60)).padStart(2, '0');
    const mm = String(total % 60).padStart(2, '0');
    times.push(`${hh}:${mm}`);
  }
  return times;
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
    const { timeStr } = getRomeTime();

    try {
      // 1. Promemoria citisina automatici
      const cytisineUsers = await prisma.user.findMany({
        where: { cytisineStartDate: { not: null }, firstDoseTime: { not: null } },
        include: { pushSubscriptions: true },
      });

      for (const user of cytisineUsers) {
        const phase = getPhase(user.cytisineStartDate);
        if (!phase) continue;
        const doseTimes = getDoseTimes(user.firstDoseTime, phase);
        const doseIndex = doseTimes.indexOf(timeStr);
        if (doseIndex === -1) continue;

        await dispatchToUser(user, {
          title: `QuitFresh · Giorno ${phase.day}`,
          body: `Capsula ${doseIndex + 1} di ${phase.pills} · ${phase.label}. Prendila ora!`,
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
