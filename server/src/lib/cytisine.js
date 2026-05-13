// Protocollo standard Tabex (Sopharma) — 25 giorni totali
const DEFAULT_SCHEDULE = [
  { days: 3, pills: 6, intervalMin: 120 },
  { days: 9, pills: 5, intervalMin: 150 },
  { days: 4, pills: 4, intervalMin: 180 },
  { days: 4, pills: 3, intervalMin: 300 },
  { days: 5, pills: 1, intervalMin: 0   },
];

// Restituisce un array valido di fasi o null se l'input è inutilizzabile.
function normalizeSchedule(raw) {
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

// Trova fase attiva dato lo schedule e la data di inizio
function getActivePhase(schedule, startDate, now = new Date()) {
  const normalized = normalizeSchedule(schedule) || DEFAULT_SCHEDULE;
  const start = new Date(startDate);
  const day = Math.floor((now - start) / 86400000) + 1;
  if (day < 1) return null;

  let cumulative = 0;
  for (let i = 0; i < normalized.length; i++) {
    const phase = normalized[i];
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

function getDoseTimes(firstDoseTime, phase) {
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

module.exports = { DEFAULT_SCHEDULE, normalizeSchedule, getActivePhase, getDoseTimes };
