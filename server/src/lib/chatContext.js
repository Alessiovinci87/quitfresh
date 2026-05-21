const prisma = require('./prisma');
const { getUserProgress } = require('./progress');

const CRAVING_WINDOW_DAYS = 14;
const DIARY_WINDOW_DAYS = 7;

function timeBucket(hour) {
  if (hour >= 5 && hour < 12) return 'mattina';
  if (hour >= 12 && hour < 17) return 'pomeriggio';
  if (hour >= 17 && hour < 21) return 'sera';
  return 'notte';
}

function topN(map, n) {
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
}

// Aggrega segnali utili per personalizzare il prompt:
// - orari ricorrenti dei craving
// - parole/trigger ricorrenti nel campo `context`
// - sintesi diario recente (capsule, sigarette, effetti)
async function buildChatContext(user, now = new Date()) {
  const progress = getUserProgress(user, now);

  const cravingSince = new Date(now.getTime() - CRAVING_WINDOW_DAYS * 86400000);
  const diarySince = new Date(now.getTime() - DIARY_WINDOW_DAYS * 86400000);

  const [cravingLogs, diaryEntries, cravingsBattled] = await Promise.all([
    prisma.cravingLog.findMany({
      where: { userId: user.id, timestamp: { gte: cravingSince } },
      orderBy: { timestamp: 'desc' },
      take: 50,
    }),
    prisma.diaryEntry.findMany({
      where: { userId: user.id, date: { gte: diarySince } },
      orderBy: { date: 'desc' },
      take: 7,
    }),
    prisma.cravingSession.count({ where: { userId: user.id } }),
  ]);

  // Aggregazione orari (bucket di mezz'ora) e fasce
  const halfHourCounts = new Map();
  const bucketCounts = new Map();
  const contextWords = new Map();

  for (const log of cravingLogs) {
    const d = new Date(log.timestamp);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = d.getMinutes() < 30 ? '00' : '30';
    const key = `${hh}:${mm}`;
    halfHourCounts.set(key, (halfHourCounts.get(key) || 0) + 1);
    const bucket = timeBucket(d.getHours());
    bucketCounts.set(bucket, (bucketCounts.get(bucket) || 0) + 1);

    if (log.context) {
      const txt = log.context.toLowerCase();
      // estrai trigger noti
      const triggers = [
        'pranzo', 'cena', 'colazione', 'caffè', 'caffe', 'stress',
        'lavoro', 'noia', 'guida', 'alcol', 'amici', 'pausa',
        'sigaretta', 'rabbia', 'ansia', 'sonno', 'mattina', 'sera',
      ];
      for (const t of triggers) {
        if (txt.includes(t)) contextWords.set(t, (contextWords.get(t) || 0) + 1);
      }
    }
  }

  // Sintesi diario
  const diarySummary = diaryEntries.slice(0, 5).map((e) => ({
    date: e.date.toISOString().slice(0, 10),
    pills: e.pillsTaken,
    cigs: e.cigarettesToday,
    sideEffects: e.sideEffects || [],
    notes: (e.notes || '').slice(0, 120),
  }));

  return {
    progress,
    cravingsBattled,
    cravingsLast14d: cravingLogs.length,
    topCravingTimes: topN(halfHourCounts, 3).map(([t, n]) => ({ time: t, count: n })),
    topCravingBuckets: topN(bucketCounts, 2).map(([b, n]) => ({ bucket: b, count: n })),
    topTriggers: topN(contextWords, 3).map(([w, n]) => ({ trigger: w, count: n })),
    diarySummary,
  };
}

module.exports = { buildChatContext, timeBucket };
