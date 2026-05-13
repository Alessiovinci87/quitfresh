// Protocollo standard Tabex (Sopharma) — 25 giorni
export const DEFAULT_SCHEDULE = [
  { days: 3, pills: 6, intervalMin: 120 },
  { days: 9, pills: 5, intervalMin: 150 },
  { days: 4, pills: 4, intervalMin: 180 },
  { days: 4, pills: 3, intervalMin: 300 },
  { days: 5, pills: 1, intervalMin: 0   },
];

export function normalizeSchedule(raw) {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const out = [];
  for (const p of raw) {
    const days = parseInt(p?.days);
    const pills = parseInt(p?.pills);
    const intervalMin = parseInt(p?.intervalMin ?? 0);
    if (!Number.isFinite(days) || days < 1) return null;
    if (!Number.isFinite(pills) || pills < 1) return null;
    out.push({
      days,
      pills,
      intervalMin: Number.isFinite(intervalMin) && intervalMin >= 0 ? intervalMin : 0,
    });
  }
  return out;
}

export function totalDays(schedule) {
  const s = schedule || DEFAULT_SCHEDULE;
  return s.reduce((sum, p) => sum + p.days, 0);
}

export function getActivePhase(schedule, startDate, now = new Date()) {
  if (!startDate) return null;
  const s = schedule || DEFAULT_SCHEDULE;
  const day = Math.floor((now - new Date(startDate)) / 86400000) + 1;
  if (day < 1) return null;

  let cumulative = 0;
  for (let i = 0; i < s.length; i++) {
    const phase = s[i];
    cumulative += phase.days;
    if (day <= cumulative) {
      return {
        index: i,
        day,
        dayInPhase: day - (cumulative - phase.days),
        pills: phase.pills,
        intervalMin: phase.intervalMin,
        phaseDays: phase.days,
      };
    }
  }
  return null;
}

export function getDoseTimes(firstDoseTime, phase) {
  if (!firstDoseTime || !phase) return [];
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

export function formatInterval(min) {
  if (min === 0) return 'al giorno';
  if (min < 60) return `${min} min`;
  if (min % 60 === 0) return `${min / 60} h`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h ${m}min`;
}

export function phaseDayRange(schedule, phaseIdx) {
  const s = schedule || DEFAULT_SCHEDULE;
  let start = 1;
  for (let i = 0; i < phaseIdx; i++) start += s[i].days;
  const end = start + s[phaseIdx].days - 1;
  return start === end ? `${start}` : `${start}–${end}`;
}
