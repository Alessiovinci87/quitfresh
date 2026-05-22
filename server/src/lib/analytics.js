// Aggregazione dati telemetria + reconstruction storica dalle tabelle
// esistenti (CravingLog, CravingSession, DiaryEntry, User.premiumSince…)
// per dare valore anche agli utenti registrati PRIMA dell'introduzione
// degli UsageEvent.

const prisma = require('./prisma');

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfRomeDay(d = new Date()) {
  // ZonedDateTime poor-man: usa toLocaleString per ottenere Rome wall-clock,
  // poi ricostruisce un Date locale. Non perfetto ma sufficiente per granularita' giorno.
  const rome = new Date(d.toLocaleString('en-US', { timeZone: 'Europe/Rome' }));
  rome.setHours(0, 0, 0, 0);
  return rome;
}

async function buildDailyReportData({ days = 30 } = {}) {
  const now = new Date();
  const todayStart = startOfRomeDay(now);
  const yesterdayStart = new Date(todayStart.getTime() - DAY_MS);
  const weekAgo = new Date(todayStart.getTime() - 7 * DAY_MS);
  const monthAgo = new Date(todayStart.getTime() - 30 * DAY_MS);
  const periodStart = new Date(todayStart.getTime() - days * DAY_MS);

  const [
    totalUsers,
    newUsersYesterday,
    newPremiumYesterday,
    activeYesterday,
    activeWeek,
    activeMonth,
    eventsYesterday,
    eventsByTypePeriod,
    newUsersList,
    dormantUsers,
    chatLimitHits,
    topActiveUsers,
    paymentsByPromoYesterday,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: yesterdayStart, lt: todayStart } } }),
    prisma.user.count({ where: { premiumSince: { gte: yesterdayStart, lt: todayStart } } }),
    prisma.user.count({ where: { lastActiveAt: { gte: yesterdayStart } } }),
    prisma.user.count({ where: { lastActiveAt: { gte: weekAgo } } }),
    prisma.user.count({ where: { lastActiveAt: { gte: monthAgo } } }),
    prisma.usageEvent.findMany({
      where: { createdAt: { gte: yesterdayStart, lt: todayStart } },
      select: { type: true, userId: true },
    }),
    prisma.usageEvent.groupBy({
      by: ['type'],
      where: { createdAt: { gte: periodStart } },
      _count: { _all: true },
    }),
    prisma.user.findMany({
      where: { createdAt: { gte: yesterdayStart, lt: todayStart } },
      select: { id: true, email: true, createdAt: true, emailVerified: true, quitDate: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.findMany({
      where: {
        OR: [
          { lastActiveAt: { lt: new Date(now.getTime() - 14 * DAY_MS) } },
          { AND: [{ lastActiveAt: null }, { createdAt: { lt: new Date(now.getTime() - 3 * DAY_MS) } }] },
        ],
      },
      select: { id: true, email: true, lastActiveAt: true, createdAt: true },
      take: 20,
      orderBy: { lastActiveAt: 'asc' },
    }),
    prisma.usageEvent.count({
      where: { type: 'chat_limit_hit', createdAt: { gte: yesterdayStart, lt: todayStart } },
    }),
    prisma.usageEvent.groupBy({
      by: ['userId'],
      where: { createdAt: { gte: yesterdayStart, lt: todayStart }, userId: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { userId: 'desc' } },
      take: 5,
    }),
    prisma.user.count({
      where: { premiumSince: { gte: yesterdayStart, lt: todayStart }, promoCodeUsed: { not: null } },
    }),
  ]);

  // Eventi di ieri raggruppati per tipo (più leggibile per la mail).
  const yesterdayByType = {};
  for (const e of eventsYesterday) {
    yesterdayByType[e.type] = (yesterdayByType[e.type] || 0) + 1;
  }
  const uniqueActiveUserIdsYesterday = new Set(eventsYesterday.map(e => e.userId).filter(Boolean));

  // Funnel SOS ieri
  const sosStarted = yesterdayByType['sos_started'] || 0;
  const sosCompleted = yesterdayByType['sos_completed'] || 0;

  // Funnel paywall ieri
  const paywallSeen = yesterdayByType['paywall_seen'] || 0;
  const paywallCta = yesterdayByType['paywall_cta_clicked'] || 0;
  const checkoutStarted = yesterdayByType['checkout_started'] || 0;

  // Arricchisce topActiveUsers con email
  const topIds = topActiveUsers.map(u => u.userId).filter(Boolean);
  const topUsers = topIds.length
    ? await prisma.user.findMany({
        where: { id: { in: topIds } },
        select: { id: true, email: true },
      })
    : [];
  const topMap = new Map(topUsers.map(u => [u.id, u.email]));
  const topActive = topActiveUsers.map(u => ({
    userId: u.userId,
    email: topMap.get(u.userId) || '—',
    actions: u._count._all,
  }));

  const eventsByType = {};
  for (const e of eventsByTypePeriod) eventsByType[e.type] = e._count._all;

  return {
    generatedAt: now.toISOString(),
    period: { days, periodStart: periodStart.toISOString(), yesterdayStart: yesterdayStart.toISOString() },
    overall: {
      totalUsers,
      DAU: activeYesterday,
      WAU: activeWeek,
      MAU: activeMonth,
      dauOverTotal: totalUsers ? activeYesterday / totalUsers : 0,
    },
    yesterday: {
      newUsers: newUsersYesterday,
      newPremium: newPremiumYesterday,
      newPremiumViaPromo: paymentsByPromoYesterday,
      activeUniqueByEvents: uniqueActiveUserIdsYesterday.size,
      chatLimitHits,
      sos: { started: sosStarted, completed: sosCompleted, completionRate: sosStarted ? sosCompleted / sosStarted : null },
      paywall: { seen: paywallSeen, cta: paywallCta, checkout: checkoutStarted },
      byType: yesterdayByType,
    },
    period_aggregate: { eventsByType },
    topActive,
    newUsersList,
    dormantUsers,
  };
}

// Reconstruction: timeline di un utente unendo UsageEvent + dati storici
// dalle altre tabelle. Cosi' anche i 2 utenti pre-telemetria vedi tutto.
async function buildUserTimeline(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      createdAt: true,
      lastActiveAt: true,
      isPremium: true,
      premiumSince: true,
      emailVerified: true,
      cigarettesPerDay: true,
      cigarettePackPrice: true,
      criticalMoments: true,
      dependencyLevel: true,
      quitDate: true,
      smokeFreeSince: true,
      cytisineStartDate: true,
      cytisineSchedule: true,
      firstDoseTime: true,
      notificationTimes: true,
      encouragementTime: true,
      streakFreezesUsed: true,
      promoCodeUsed: true,
      isAdmin: true,
      quitReasons: true,
      cravingsBattled: true,
      chatMessagesUsed: true,
      chatWeekStart: true,
      freemiumGrandfathered: true,
      analyticsOptOut: true,
    },
  });
  if (!user) return null;

  const [events, diaryEntries, cravingLogs, cravingSessions, quitAttempts, pushSubs] = await Promise.all([
    prisma.usageEvent.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 500,
    }),
    prisma.diaryEntry.findMany({ where: { userId }, orderBy: { date: 'desc' } }),
    prisma.cravingLog.findMany({ where: { userId }, orderBy: { timestamp: 'desc' } }),
    prisma.cravingSession.findMany({ where: { userId }, orderBy: { completedAt: 'desc' } }),
    prisma.quitAttempt.findMany({ where: { userId }, orderBy: { startDate: 'desc' } }),
    prisma.pushSubscription.findMany({ where: { userId }, select: { endpoint: true } }),
  ]);

  // Timeline unificata: ogni record diventa un punto con {when, source, type, data}.
  const timeline = [];
  timeline.push({ when: user.createdAt, source: 'user', type: 'account_created', data: { email: user.email } });
  if (user.emailVerified) timeline.push({ when: user.createdAt, source: 'user', type: 'email_verified_eventually', data: {} });
  if (user.quitDate) timeline.push({ when: user.quitDate, source: 'user', type: 'quit_date_set', data: { quitDate: user.quitDate } });
  if (user.smokeFreeSince) timeline.push({ when: user.smokeFreeSince, source: 'user', type: 'smoke_free_since', data: {} });
  if (user.cytisineStartDate) timeline.push({ when: user.cytisineStartDate, source: 'user', type: 'cytisine_started', data: {} });
  if (user.premiumSince) timeline.push({ when: user.premiumSince, source: 'user', type: 'premium_activated', data: { promo: user.promoCodeUsed } });
  if (user.lastActiveAt) timeline.push({ when: user.lastActiveAt, source: 'user', type: 'last_active', data: {} });

  for (const e of events) {
    timeline.push({ when: e.createdAt, source: 'event', type: e.type, data: { path: e.path, ...(e.meta || {}) } });
  }
  for (const d of diaryEntries) {
    timeline.push({ when: d.createdAt, source: 'diary', type: 'diary_entry', data: { date: d.date, pillsTaken: d.pillsTaken, cigarettesToday: d.cigarettesToday, sideEffects: d.sideEffects } });
  }
  for (const c of cravingLogs) {
    timeline.push({ when: c.timestamp, source: 'craving_log', type: 'craving_logged', data: c });
  }
  for (const s of cravingSessions) {
    timeline.push({ when: s.completedAt, source: 'sos', type: 'sos_session', data: { type: s.type, before: s.intensityBefore, after: s.intensityAfter } });
  }
  for (const q of quitAttempts) {
    timeline.push({ when: q.startDate, source: 'quit_attempt', type: 'quit_attempt_start', data: { startDate: q.startDate, endDate: q.endDate } });
  }

  timeline.sort((a, b) => new Date(b.when) - new Date(a.when));

  return {
    user,
    counts: {
      events: events.length,
      diaryEntries: diaryEntries.length,
      cravingLogs: cravingLogs.length,
      cravingSessions: cravingSessions.length,
      quitAttempts: quitAttempts.length,
      pushSubscriptions: pushSubs.length,
    },
    timeline,
  };
}

module.exports = { buildDailyReportData, buildUserTimeline };
