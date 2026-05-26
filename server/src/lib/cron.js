const cron = require('node-cron');
const prisma = require('./prisma');
const { sendPush, isEnabled } = require('./push');
const { getActivePhase, getDoseTimes } = require('./cytisine');
const { runScheduledBackup } = require('./backup');
const { buildDailyReportData } = require('./analytics');
const { sendDailyReportEmail } = require('./email');
const { cleanupOldUsage } = require('./cognitiveSelector');
const { bandForSendTime, percorsoDayIndex, isInPercorsoWindow, momentMessageForDay } = require('./triggerNotify');

// Dedup cache primaria citisina (chiave: userId_YYYYMMDD_doseIndex).
// Vive in memoria: al restart del container si svuota — accettabile perché
// la primaria scatta nei primi 9 minuti dopo il dose time, finestra piccola
// abbastanza che un restart non causi spam doppio nel caso peggiore.
const sentPrimaryCache = new Map();

function pruneCacheOldEntries(currentYMD) {
  for (const key of sentPrimaryCache.keys()) {
    if (!key.includes(`_${currentYMD}_`)) sentPrimaryCache.delete(key);
  }
}

function ymdOf(romeDate) {
  return `${romeDate.getFullYear()}${String(romeDate.getMonth() + 1).padStart(2, '0')}${String(romeDate.getDate()).padStart(2, '0')}`;
}

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

function buildEncouragementMessage(days) {
  const dayLabel = days === 1 ? 'un giorno intero' : `${days} giorni`;
  const dayShort = days === 1 ? '1 giorno' : `${days} giorni`;
  const pool = [
    `Sono ${dayShort} senza fumo. Stai andando alla grande.`,
    `Hai resistito ${dayLabel}. Ogni giornata vinta è tua.`,
    `${dayShort} di nuovo respiro. Vai così.`,
    `Sei a quota ${dayShort}. Una scelta forte, oggi e ogni giorno.`,
    `${dayShort}: il tuo corpo ti ringrazia ogni minuto.`,
  ];
  return pool[Math.floor(Math.random() * pool.length)];
}

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
  // Daily analytics report 08:30 Europe/Rome — admin email con metriche di ieri.
  cron.schedule('30 8 * * *', async () => {
    try {
      const data = await buildDailyReportData({ days: 7 });
      await sendDailyReportEmail(data);
      console.log('[analytics-cron] daily report inviato');
    } catch (err) {
      console.error('[analytics-cron] errore:', err.message);
    }
  }, { timezone: 'Europe/Rome' });

  // Retention UsageEvent: cancella eventi più vecchi di 90 giorni.
  // Settimanale, domenica 03:30.
  cron.schedule('30 3 * * 0', async () => {
    try {
      const cutoff = new Date(Date.now() - 90 * 86400000);
      const result = await prisma.usageEvent.deleteMany({ where: { createdAt: { lt: cutoff } } });
      console.log(`[analytics-retention] cancellati ${result.count} eventi >90gg`);
    } catch (err) {
      console.error('[analytics-retention] errore:', err.message);
    }
  }, { timezone: 'Europe/Rome' });

  // Retention ChatMessage: cancella messaggi più vecchi di 90 giorni.
  // Privacy (conversazioni con dati sanitari sensibili) + cost control DB.
  // L'utente puo' sempre cancellare manualmente prima da UI (menu chat).
  // Settimanale, domenica 03:45 (sfasato da analytics per non sovrapporre).
  cron.schedule('45 3 * * 0', async () => {
    try {
      const cutoff = new Date(Date.now() - 90 * 86400000);
      const result = await prisma.chatMessage.deleteMany({ where: { createdAt: { lt: cutoff } } });
      console.log(`[chat-retention] cancellati ${result.count} messaggi chat >90gg`);
    } catch (err) {
      console.error('[chat-retention] errore:', err.message);
    }
  }, { timezone: 'Europe/Rome' });

  // Retention CognitivePhraseUsage: il tracking anti-ripescaggio guarda solo
  // gli ultimi 30gg, quindi i record oltre 35gg sono inutili. Giornaliero 03:50.
  cron.schedule('50 3 * * *', async () => {
    try {
      const count = await cleanupOldUsage();
      console.log(`[cognitive-retention] cancellati ${count} record uso frasi >35gg`);
    } catch (err) {
      console.error('[cognitive-retention] errore:', err.message);
    }
  }, { timezone: 'Europe/Rome' });

  // Backup DB giornaliero 08:00 Europe/Rome — INDIPENDENTE da push.
  // Lo schedulo PRIMA della guard isEnabled() così funziona anche se
  // VAPID/web-push non è configurato.
  cron.schedule('0 8 * * *', async () => {
    try {
      await runScheduledBackup({ trigger: 'cron' });
    } catch (err) {
      console.error('[backup-cron] errore:', err.message);
    }
  }, { timezone: 'Europe/Rome' });

  if (!isEnabled()) {
    console.log('[cron] scheduler backup avviato (push disabilitato)');
    return;
  }

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

      // Freemium gate: utenti free (non premium, non grandfathered) ricevono
      // promemoria citisina solo nei primi 3 giorni del protocollo. Premium
      // e grandfathered (registrati pre-rollout freemium) restano illimitati.
      const FREE_CYTISINE_DAYS = 3;
      const isCytisineAllowed = (user, phase) => {
        if (!phase) return false;
        if (user.isPremium || user.freemiumGrandfathered) return true;
        return phase.day <= FREE_CYTISINE_DAYS;
      };

      // Pre-calcolo bounds di oggi in Europe/Rome per query pillsTaken.
      const todayStart = new Date(romeNow);
      todayStart.setHours(0, 0, 0, 0);
      const tomorrowStart = new Date(todayStart);
      tomorrowStart.setDate(tomorrowStart.getDate() + 1);

      const todayYMD = ymdOf(romeNow);
      pruneCacheOldEntries(todayYMD);

      for (const user of cytisineUsers) {
        const start = new Date(new Date(user.cytisineStartDate).toLocaleString('en-US', { timeZone: 'Europe/Rome' }));
        const phase = getActivePhase(user.cytisineSchedule, start, romeNow);
        if (!isCytisineAllowed(user, phase)) continue;

        const doseTimes = getDoseTimes(user.firstDoseTime, phase);
        if (doseTimes.length === 0) continue;

        // Trova l'ultima dose il cui orario è già arrivato (incluso quello
        // corrente). Se nessuna ha ancora il via, skip — il primo dose del
        // giorno arriverà in un tick successivo.
        const passedOrCurrent = doseTimes.filter(t => t <= timeStr);
        if (passedOrCurrent.length === 0) continue;

        const lastDose = passedOrCurrent[passedOrCurrent.length - 1];
        const doseIndex = doseTimes.indexOf(lastDose);
        const [lh, lm] = lastDose.split(':').map(Number);
        const [ch, cm] = timeStr.split(':').map(Number);
        const minutesSinceDose = (ch * 60 + cm) - (lh * 60 + lm);

        // Capsula gia' confermata dall'utente? Stop reminder per questa dose.
        const expectedTaken = doseIndex + 1;
        const diary = await prisma.diaryEntry.findFirst({
          where: { userId: user.id, date: { gte: todayStart, lt: tomorrowStart } },
        });
        const actualTaken = diary?.pillsTaken ?? 0;
        if (actualTaken >= expectedTaken) continue;

        const primaryKey = `${user.id}_${todayYMD}_${doseIndex}`;

        // 1a. PRIMARIA: scatta nei primi 9 minuti dopo il dose time. La
        //     finestra ampia (vs match esatto al minuto) tollera drift di
        //     node-cron, restart container, carico CPU. Dedup via cache in
        //     memoria così non spamma a ogni tick dentro la finestra.
        if (minutesSinceDose <= 9 && !sentPrimaryCache.has(primaryKey)) {
          sentPrimaryCache.set(primaryKey, true);
          await dispatchToUser(user, {
            title: `QuitFresh · Giorno ${phase.day}`,
            body: `Capsula ${doseIndex + 1} di ${phase.pills} · Fase ${phase.index + 1}. Prendila ora!`,
          });
          continue;
        }

        // 1b. RICORRENTE: ogni 10 minuti dopo il dose time, cap a 60.
        //     L'utente l'ha vista una volta (primaria) ma non ha confermato:
        //     ricorda finché conferma o passa l'ora.
        if (minutesSinceDose >= 10 && minutesSinceDose <= 60 && minutesSinceDose % 10 === 0) {
          await dispatchToUser(user, {
            title: `Promemoria capsula ${expectedTaken} di ${phase.pills}`,
            body: `Se l'hai gia' presa, segnala nella sezione "Capsule oggi" della home — il reminder si ferma quando aggiorni.`,
          });
        }
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

      // 3. Incoraggiamento giornaliero — singolo orario per utente, conta i giorni
      // senza fumo dal quitDate (saltato se quitDate è nel futuro o assente).
      const encouragementUsers = await prisma.user.findMany({
        where: {
          encouragementTime: timeStr,
          quitDate: { not: null },
          pushSubscriptions: { some: {} },
        },
        include: { pushSubscriptions: true },
      });

      for (const user of encouragementUsers) {
        const quitDate = new Date(new Date(user.quitDate).toLocaleString('en-US', { timeZone: 'Europe/Rome' }));
        const days = Math.floor((romeNow - quitDate) / 86400000);
        if (days < 1) continue;

        await dispatchToUser(user, {
          title: 'QuitFresh',
          body: buildEncouragementMessage(days),
        });
      }

      // 5. Push giornaliera del "momento di oggi" — UNA al giorno, 45 min prima
      // della fascia di craving dichiarata (triggerBand). Si attiva solo nei 4
      // minuti d'invio (07:15/12:15/15:00/19:30): negli altri minuti bandForSendTime
      // è null e saltiamo la query. Testo rotante autonomo (non anteprima del
      // contenuto), un messaggio per giorno del percorso. Niente reminder/streak.
      const sendBand = bandForSendTime(timeStr);
      if (sendBand) {
        const momentUsers = await prisma.user.findMany({
          where: {
            triggerBand: sendBand,
            quitDate: { not: null },
            pushSubscriptions: { some: {} },
          },
          include: { pushSubscriptions: true },
        });

        for (const user of momentUsers) {
          // Solo dentro la finestra dei 28 giorni: oltre, non c'è un "momento
          // di oggi" da osservare, quindi la nudge tacerebbe a vuoto.
          if (!isInPercorsoWindow(user.quitDate, romeNow)) continue;
          const dayIndex = percorsoDayIndex(user.quitDate, romeNow);
          await dispatchToUser(user, {
            title: 'QuitFresh',
            body: momentMessageForDay(dayIndex),
          });
        }
      }

      // 4. Notifica "giorno 5 citisina" — punto chiave del protocollo.
      // Il foglietto Sopharma/Tabex indica il 5° giorno come deadline
      // raccomandata per smettere di fumare. Una push al firstDoseTime
      // (= mattino prima capsula) di quel giorno. Messaggio caldo +
      // cita il foglietto + indirizza al medico (inattaccabilità).
      for (const user of cytisineUsers) {
        const start = new Date(new Date(user.cytisineStartDate).toLocaleString('en-US', { timeZone: 'Europe/Rome' }));
        const phase = getActivePhase(user.cytisineSchedule, start, romeNow);
        if (!phase || phase.day !== 5) continue;

        const targetTime = user.firstDoseTime || '09:00';
        if (timeStr !== targetTime) continue;

        await dispatchToUser(user, {
          title: 'Giorno 5: punto chiave 🌱',
          body: 'Sei al 5° giorno: il punto del protocollo in cui la citisina ti dà il massimo aiuto. Da oggi, ogni sigaretta in meno conta di più — è quanto indicato sul foglietto del produttore. Hai dubbi? Il tuo medico è la voce giusta a cui chiedere.',
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

  console.log('[cron] scheduler notifiche + backup avviato');
}

module.exports = { startCron };
