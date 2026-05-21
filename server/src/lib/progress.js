const { getActivePhase } = require('./cytisine');

function daysBetween(from, to) {
  return Math.max(0, Math.floor((to - new Date(from)) / 86400000));
}

// Single source of truth per i contatori utente.
// Stessa logica di routes/progress.js — modificare entrambi se si cambia
// la semantica (giorni, risparmio).
function getUserProgress(user, now = new Date()) {
  const daysSinceQuit = user.quitDate ? daysBetween(user.quitDate, now) : 0;

  const cigarettesPerDay = user.cigarettesPerDay || 0;
  const cigarettesAvoided = daysSinceQuit * cigarettesPerDay;

  const packPrice = user.cigarettePackPrice ?? 5.80;
  const moneySaved = Math.round((cigarettesAvoided / 20) * packPrice * 100) / 100;

  let cytisineDay = null;
  let cytisinePhase = null;
  if (user.cytisineStartDate) {
    cytisineDay = daysBetween(user.cytisineStartDate, now) + 1; // 1-based
    cytisinePhase = getActivePhase(user.cytisineSchedule, user.cytisineStartDate, now);
  }

  return {
    daysSinceQuit,
    cigarettesPerDay,
    cigarettesAvoided,
    moneySaved,
    cytisineDay,
    cytisinePhase,
  };
}

module.exports = { getUserProgress, daysBetween };
