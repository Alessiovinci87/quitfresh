import { useState, useEffect } from 'react';
import { api } from '../api/client';

const HEALTH_MILESTONES = [
  { hours: 0.33,  label: '20 minuti',     desc: 'Pressione e battito cardiaco si normalizzano' },
  { hours: 8,     label: '8 ore',          desc: 'CO nel sangue dimezzato, ossigeno ai livelli normali' },
  { hours: 24,    label: '1 giorno',       desc: 'Il rischio di infarto inizia a diminuire' },
  { hours: 48,    label: '2 giorni',       desc: 'Le terminazioni nervose iniziano a rigenerarsi' },
  { hours: 168,   label: '1 settimana',    desc: 'Gusto e olfatto migliorano notevolmente' },
  { hours: 336,   label: '2 settimane',    desc: 'Circolazione migliora, la tosse diminuisce' },
  { hours: 720,   label: '1 mese',         desc: 'Funzione polmonare migliora del 30%' },
  { hours: 2160,  label: '3 mesi',         desc: 'Ciglia nei polmoni si ripristinano' },
  { hours: 8760,  label: '1 anno',         desc: 'Rischio malattie cardiache dimezzato' },
];

function buildCalendar(year, month) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  let startPad = firstDay.getDay() - 1;
  if (startPad < 0) startPad = 6;
  const days = [];
  for (let i = 0; i < startPad; i++) days.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) days.push(d);
  return days;
}

export default function Stats() {
  const [progress, setProgress] = useState(null);
  const [goal, setGoal] = useState(() => parseFloat(localStorage.getItem('qf_savings_goal') || '0'));
  const [goalInput, setGoalInput] = useState('');
  const [editingGoal, setEditingGoal] = useState(false);
  const [calMonth, setCalMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  useEffect(() => {
    api.progress.get().then(setProgress).catch(console.error);
  }, []);

  const hoursSinceQuit = (progress?.daysSinceQuit ?? 0) * 24;
  const moneySaved = progress?.moneySaved ?? 0;

  const nextMilestone = HEALTH_MILESTONES.find(m => m.hours > hoursSinceQuit);
  const nextHoursLeft = nextMilestone ? nextMilestone.hours - hoursSinceQuit : 0;

  function saveGoal() {
    const val = parseFloat(goalInput);
    if (!isNaN(val) && val > 0) {
      localStorage.setItem('qf_savings_goal', String(val));
      setGoal(val);
    }
    setEditingGoal(false);
    setGoalInput('');
  }

  const goalPct = goal > 0 ? Math.min(100, (moneySaved / goal) * 100) : 0;
  const ratePerDay = progress?.daysSinceQuit > 0 ? moneySaved / progress.daysSinceQuit : null;
  const daysToGoal = ratePerDay && goal > moneySaved
    ? Math.ceil((goal - moneySaved) / ratePerDay)
    : null;

  const quitDate = progress?.quitDate ? new Date(progress.quitDate) : null;
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const calDays = buildCalendar(calMonth.year, calMonth.month);

  function isDaySmokeFree(d) {
    if (!quitDate || !d) return false;
    const dayDate = new Date(calMonth.year, calMonth.month, d, 23, 59, 59);
    const qd = new Date(quitDate);
    qd.setHours(0, 0, 0, 0);
    return dayDate >= qd && dayDate <= todayEnd;
  }

  function isToday(d) {
    if (!d) return false;
    const now = new Date();
    return calMonth.year === now.getFullYear() && calMonth.month === now.getMonth() && d === now.getDate();
  }

  function prevMonth() {
    setCalMonth(({ year, month }) =>
      month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 }
    );
  }

  function nextMonth() {
    setCalMonth(({ year, month }) =>
      month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 }
    );
  }

  const monthName = new Date(calMonth.year, calMonth.month, 1)
    .toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });

  return (
    <div className="p-4 space-y-6">
      {/* SALUTE */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">❤️ Salute nel tempo</h2>

        {nextMilestone && (
          <div className="bg-sage-50 border border-sage-200 rounded-xl p-3 mb-3 flex items-start gap-3">
            <span className="text-2xl mt-0.5">🎯</span>
            <div>
              <p className="text-sm font-semibold text-sage-700">Prossimo: {nextMilestone.label}</p>
              <p className="text-xs text-sage-600 mt-0.5">{nextMilestone.desc}</p>
              <p className="text-xs text-gray-400 mt-1">
                tra{' '}
                {nextHoursLeft < 1
                  ? `${Math.ceil(nextHoursLeft * 60)} minuti`
                  : nextHoursLeft < 24
                  ? `${Math.round(nextHoursLeft)} ore`
                  : `${Math.ceil(nextHoursLeft / 24)} giorni`}
              </p>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {HEALTH_MILESTONES.map((m) => {
            const earned = hoursSinceQuit >= m.hours;
            return (
              <div
                key={m.hours}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${
                  earned ? 'bg-sage-50' : 'bg-gray-50'
                }`}
              >
                <span className={`text-lg flex-shrink-0 ${earned ? '' : 'grayscale opacity-40'}`}>
                  {earned ? '✅' : '⏳'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${earned ? 'text-sage-700' : 'text-gray-400'}`}>
                    {m.label}
                  </p>
                  <p className={`text-xs ${earned ? 'text-sage-600' : 'text-gray-400'}`}>
                    {m.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* RISPARMIO */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">💰 Risparmio</h2>
        <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm space-y-3">
          <div className="flex justify-between items-baseline">
            <span className="text-sm text-gray-500">Risparmiato finora</span>
            <span className="text-2xl font-bold text-sage-600">€{moneySaved.toFixed(2)}</span>
          </div>

          {goal > 0 && !editingGoal ? (
            <>
              <div>
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Obiettivo: €{goal.toFixed(0)}</span>
                  <span>{goalPct.toFixed(0)}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5">
                  <div
                    className="bg-sage-500 h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${goalPct}%` }}
                  />
                </div>
              </div>
              {goalPct >= 100 ? (
                <p className="text-sm font-semibold text-sage-600 text-center">🎉 Obiettivo raggiunto!</p>
              ) : daysToGoal !== null ? (
                <p className="text-xs text-gray-400">
                  Raggiungerai l'obiettivo in circa{' '}
                  <span className="font-medium text-gray-600">{daysToGoal} giorni</span>
                </p>
              ) : null}
              <button
                onClick={() => { setGoalInput(String(goal)); setEditingGoal(true); }}
                className="text-xs text-sage-600 underline"
              >
                Modifica obiettivo
              </button>
            </>
          ) : !editingGoal ? (
            <button
              onClick={() => setEditingGoal(true)}
              className="w-full border border-dashed border-sage-300 rounded-lg py-2.5 text-sm text-sage-600 hover:bg-sage-50 transition"
            >
              + Imposta un obiettivo di risparmio
            </button>
          ) : null}

          {editingGoal && (
            <div className="flex gap-2">
              <input
                type="number"
                value={goalInput}
                onChange={e => setGoalInput(e.target.value)}
                placeholder="es. 500"
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-400"
                autoFocus
                onKeyDown={e => e.key === 'Enter' && saveGoal()}
              />
              <button
                onClick={saveGoal}
                className="bg-sage-500 text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                Salva
              </button>
              <button
                onClick={() => setEditingGoal(false)}
                className="text-gray-400 px-2 text-lg leading-none"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      </section>

      {/* CALENDARIO */}
      <section className="pb-4">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">📅 Calendario</h2>
        <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="text-gray-400 hover:text-gray-600 text-xl px-1">‹</button>
            <span className="text-sm font-medium text-gray-700 capitalize">{monthName}</span>
            <button onClick={nextMonth} className="text-gray-400 hover:text-gray-600 text-xl px-1">›</button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {['L', 'M', 'M', 'G', 'V', 'S', 'D'].map((d, i) => (
              <span key={i} className="text-xs text-gray-400 font-medium">{d}</span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calDays.map((d, i) => {
              const sf = isDaySmokeFree(d);
              const tod = isToday(d);
              return (
                <div
                  key={i}
                  className={`aspect-square flex items-center justify-center rounded-full text-xs font-medium select-none
                    ${!d ? '' : sf && tod ? 'bg-sage-600 text-white ring-2 ring-offset-1 ring-sage-400'
                      : sf ? 'bg-sage-100 text-sage-700'
                      : tod ? 'ring-2 ring-gray-300 text-gray-600'
                      : 'text-gray-400'}`}
                >
                  {d ?? ''}
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-4 mt-4 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <div className="w-3 h-3 rounded-full bg-sage-100" />
              Senza fumo
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <div className="w-3 h-3 rounded-full bg-gray-100 border border-gray-200" />
              Altro giorno
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
