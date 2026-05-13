import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';

const DEFAULT_PACK_PRICE = 5.80;

const HEALTH_MILESTONES = [
  { hours: 0.33,  label: '20 minuti',   desc: 'Pressione e battito cardiaco si normalizzano' },
  { hours: 8,     label: '8 ore',        desc: 'CO nel sangue dimezzato, ossigeno ai livelli normali' },
  { hours: 24,    label: '1 giorno',     desc: 'Il rischio di infarto inizia a diminuire' },
  { hours: 48,    label: '2 giorni',     desc: 'Le terminazioni nervose iniziano a rigenerarsi' },
  { hours: 72,    label: '3 giorni',     desc: 'Nicotina eliminata dal corpo, respirare diventa più facile' },
  { hours: 120,   label: '5 giorni',     desc: 'Energia in crescita, i neurotrasmettitori si normalizzano' },
  { hours: 168,   label: '1 settimana',  desc: 'Gusto e olfatto migliorano notevolmente' },
  { hours: 240,   label: '10 giorni',    desc: 'I tessuti dei polmoni iniziano a rigenerarsi, tosse in calo' },
  { hours: 336,   label: '2 settimane',  desc: 'Circolazione migliora, la tosse diminuisce' },
  { hours: 504,   label: '3 settimane',  desc: 'I recettori della dopamina tornano normali: meno craving' },
  { hours: 720,   label: '1 mese',       desc: 'Funzione polmonare migliora del 30%' },
  { hours: 2160,  label: '3 mesi',       desc: 'Ciglia nei polmoni si ripristinano' },
  { hours: 8760,  label: '1 anno',       desc: 'Rischio malattie cardiache dimezzato' },
];

function toDateStr(d) {
  return d.toISOString().split('T')[0];
}

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

function formatHoursLeft(h) {
  if (h < 1) return `${Math.ceil(h * 60)} minuti`;
  if (h < 24) return `${Math.round(h)} ore`;
  return `${Math.ceil(h / 24)} giorni`;
}

export default function Stats() {
  const [progress, setProgress] = useState(null);
  const [diaryEntries, setDiaryEntries] = useState([]);
  const [todayCigs, setTodayCigs] = useState(null); // null = not yet loaded
  const [savingCigs, setSavingCigs] = useState(false);

  // savings goal (localStorage)
  const [goal, setGoal] = useState(() => parseFloat(localStorage.getItem('qf_savings_goal') || '0'));
  const [goalInput, setGoalInput] = useState('');
  const [editingGoal, setEditingGoal] = useState(false);

  // smoke-free-since confirmation
  const [showQuitForm, setShowQuitForm] = useState(false);
  const [quitInput, setQuitInput] = useState('');
  const [settingQuit, setSettingQuit] = useState(false);

  // calendar
  const [calMonth, setCalMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const todayStr = toDateStr(new Date());

  const load = useCallback(async () => {
    const [prog, entries] = await Promise.all([
      api.progress.get(),
      api.diary.list(),
    ]);
    setProgress(prog);
    setDiaryEntries(entries);

    const todayEntry = entries.find(e => toDateStr(new Date(e.date)) === todayStr);
    setTodayCigs(todayEntry?.cigarettesToday ?? 0);
  }, [todayStr]);

  useEffect(() => { load().catch(console.error); }, [load]);

  // ── Cigarette tracker ──────────────────────────────────────────
  async function changeCigs(delta) {
    const next = Math.max(0, (todayCigs ?? 0) + delta);
    setTodayCigs(next);
    setSavingCigs(true);
    try {
      const entry = await api.diary.logCigs(todayStr, next);
      setDiaryEntries(prev => {
        const idx = prev.findIndex(e => toDateStr(new Date(e.date)) === todayStr);
        if (idx >= 0) { const a = [...prev]; a[idx] = entry; return a; }
        return [entry, ...prev];
      });
    } catch (err) {
      console.error(err);
      setTodayCigs(prev => Math.max(0, (prev ?? 0) - delta));
    } finally { setSavingCigs(false); }
  }

  // last 14 days chart data
  const last14 = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    const ds = toDateStr(d);
    const entry = diaryEntries.find(e => toDateStr(new Date(e.date)) === ds);
    return { ds, cigs: entry?.cigarettesToday ?? null };
  });
  const maxCigs = Math.max(1, ...last14.map(d => d.cigs ?? 0));

  // ── Smoke-free-since ──────────────────────────────────────────
  const smokeFreeSince = progress?.smokeFreeSince ? new Date(progress.smokeFreeSince) : null;
  const hoursFree = smokeFreeSince ? (Date.now() - smokeFreeSince.getTime()) / (1000 * 60 * 60) : 0;
  const nextMilestone = HEALTH_MILESTONES.find(m => m.hours > hoursFree);
  const nextHoursLeft = nextMilestone ? nextMilestone.hours - hoursFree : 0;
  const lastReachedMilestone = [...HEALTH_MILESTONES].reverse().find(m => m.hours <= hoursFree);

  // Prezzo pacchetto personalizzato (default 5.80)
  const packPrice = progress?.cigarettePackPrice ?? DEFAULT_PACK_PRICE;

  async function confirmQuit() {
    if (!quitInput) return;
    setSettingQuit(true);
    try {
      await api.quiz.setSmokeFreeeSince(new Date(quitInput).toISOString());
      setShowQuitForm(false);
      setQuitInput('');
      await load();
    } catch (err) { console.error(err); }
    finally { setSettingQuit(false); }
  }

  async function confirmQuitNow() {
    setSettingQuit(true);
    try {
      await api.quiz.setSmokeFreeeSince(new Date().toISOString());
      setShowQuitForm(false);
      await load();
    } catch (err) { console.error(err); }
    finally { setSettingQuit(false); }
  }

  async function resetQuit() {
    setSettingQuit(true);
    try {
      await api.quiz.setSmokeFreeeSince(null);
      await load();
    } catch (err) { console.error(err); }
    finally { setSettingQuit(false); }
  }

  // ── Risparmio ─────────────────────────────────────────────────
  const smokeFreeCount = diaryEntries.filter(e => e.cigarettesToday === 0).length;
  const totalSaved = smokeFreeCount * packPrice;
  const goalPct = goal > 0 ? Math.min(100, (totalSaved / goal) * 100) : 0;
  const ratePerDay = smokeFreeCount > 0 ? totalSaved / smokeFreeCount : packPrice;
  const daysToGoal = goal > totalSaved ? Math.ceil((goal - totalSaved) / ratePerDay) : 0;

  function saveGoal() {
    const val = parseFloat(goalInput);
    if (!isNaN(val) && val > 0) {
      localStorage.setItem('qf_savings_goal', String(val));
      setGoal(val);
    }
    setEditingGoal(false);
    setGoalInput('');
  }

  // ── Calendario ────────────────────────────────────────────────
  const calDays = buildCalendar(calMonth.year, calMonth.month);
  const cigsByDate = Object.fromEntries(
    diaryEntries.map(e => [toDateStr(new Date(e.date)), e.cigarettesToday])
  );

  function dayColor(d) {
    if (!d) return '';
    const ds = `${calMonth.year}-${String(calMonth.month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const cigs = cigsByDate[ds];
    if (cigs === undefined) return 'text-gray-300';
    if (cigs === 0) return 'bg-sage-100 text-sage-700';
    if (cigs <= 5) return 'bg-yellow-100 text-yellow-700';
    if (cigs <= 10) return 'bg-orange-100 text-orange-700';
    return 'bg-red-100 text-red-700';
  }

  function isToday(d) {
    if (!d) return false;
    const now = new Date();
    return calMonth.year === now.getFullYear() && calMonth.month === now.getMonth() && d === now.getDate();
  }

  const monthName = new Date(calMonth.year, calMonth.month, 1)
    .toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });

  // datetime-local value for "now" (local time, no seconds)
  const nowLocalStr = (() => {
    const n = new Date();
    n.setSeconds(0, 0);
    return n.toISOString().slice(0, 16);
  })();

  return (
    <div className="p-4 space-y-6">

      {/* ── TRACKER SIGARETTE ── */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">🚬 Sigarette oggi</h2>
        <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <button
              onClick={() => changeCigs(-1)}
              disabled={todayCigs === 0 || savingCigs}
              className="w-10 h-10 rounded-full bg-gray-100 text-xl font-bold text-gray-600 disabled:opacity-30 active:scale-95 transition"
            >−</button>
            <div className="text-center">
              <span className="text-4xl font-bold text-gray-800">
                {todayCigs ?? '—'}
              </span>
              {savingCigs && <p className="text-xs text-gray-400 mt-0.5">salvataggio…</p>}
            </div>
            <button
              onClick={() => changeCigs(1)}
              disabled={savingCigs}
              className="w-10 h-10 rounded-full bg-gray-100 text-xl font-bold text-gray-600 disabled:opacity-30 active:scale-95 transition"
            >+</button>
          </div>
          {todayCigs === 0 && (
            <p className="text-center text-sm text-sage-600 font-medium mt-2">🌟 Giornata senza fumo!</p>
          )}
          {todayCigs > 0 && (
            <p className="text-center text-xs text-gray-400 mt-2">
              Registra ogni sigaretta per monitorare il tuo percorso
            </p>
          )}
        </div>

        {/* Grafico ultimi 14 giorni */}
        <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm mt-3">
          <p className="text-xs font-medium text-gray-500 mb-3">Ultimi 14 giorni</p>
          <div className="flex items-end gap-1 h-16">
            {last14.map(({ ds, cigs }, i) => {
              const pct = cigs === null ? 0 : (cigs / maxCigs) * 100;
              const isSmokeFree = cigs === 0;
              const isUnknown = cigs === null;
              const isCurrentDay = ds === todayStr;
              return (
                <div key={i} className="flex-1 flex flex-col items-center justify-end gap-0.5">
                  <div
                    className={`w-full rounded-t transition-all ${
                      isUnknown ? 'bg-gray-100'
                      : isSmokeFree ? 'bg-sage-400'
                      : cigs <= 5 ? 'bg-yellow-400'
                      : cigs <= 10 ? 'bg-orange-400'
                      : 'bg-red-400'
                    } ${isCurrentDay ? 'ring-1 ring-offset-1 ring-gray-400' : ''}`}
                    style={{ height: isUnknown ? '4px' : `${Math.max(8, pct)}%` }}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-xs text-gray-300 mt-1">
            <span>{new Date(last14[0].ds).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}</span>
            <span>oggi</span>
          </div>
          <div className="flex flex-wrap gap-3 mt-3 pt-2 border-t border-gray-100">
            {[['bg-sage-400', '0 sigarette'], ['bg-yellow-400', '1–5'], ['bg-orange-400', '6–10'], ['bg-red-400', '10+']].map(([cls, lbl]) => (
              <div key={lbl} className="flex items-center gap-1 text-xs text-gray-400">
                <div className={`w-2.5 h-2.5 rounded-sm ${cls}`} />
                {lbl}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SALUTE NEL TEMPO ── */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">❤️ Salute nel tempo</h2>

        {/* CTA quit / badge non-fumo */}
        {!smokeFreeSince ? (
          <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm space-y-3 mb-3">
            <p className="text-sm text-gray-600">
              Pronto a iniziare? Premi il pulsante quando smetti — il conteggio parte da subito.
            </p>
            {!showQuitForm ? (
              <div className="flex flex-col gap-2">
                <button
                  onClick={confirmQuitNow}
                  disabled={settingQuit}
                  className="w-full bg-sage-500 text-white py-2.5 rounded-xl text-sm font-semibold active:scale-95 transition disabled:opacity-50"
                >
                  ✅ Ho smesso adesso
                </button>
                <button
                  onClick={() => { setQuitInput(nowLocalStr); setShowQuitForm(true); }}
                  className="w-full border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm"
                >
                  Ho smesso prima — inserisci data e ora
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-xs text-gray-500">Data e ora dell'ultima sigaretta</label>
                <input
                  type="datetime-local"
                  value={quitInput}
                  max={nowLocalStr}
                  onChange={e => setQuitInput(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-400"
                />
                <div className="flex gap-2">
                  <button
                    onClick={confirmQuit}
                    disabled={settingQuit || !quitInput}
                    className="flex-1 bg-sage-500 text-white py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
                  >
                    Conferma
                  </button>
                  <button onClick={() => setShowQuitForm(false)} className="text-gray-400 px-3 text-sm">
                    Annulla
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-sage-50 border border-sage-200 rounded-xl px-3 py-2.5 mb-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-sage-600 font-medium">Non fumo da</p>
              <p className="text-sm font-semibold text-sage-700">
                {smokeFreeSince.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
                {' '}ore {smokeFreeSince.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <button
              onClick={resetQuit}
              disabled={settingQuit}
              className="text-xs text-gray-400 underline ml-2"
            >
              Reimposta
            </button>
          </div>
        )}

        {/* Card 'sta succedendo ora' — solo se ha smesso e ha raggiunto qualcosa */}
        {smokeFreeSince && lastReachedMilestone && (
          <div className="bg-gradient-to-br from-sage-500 to-sage-600 rounded-xl p-4 mb-3 shadow-sm">
            <p className="text-xs font-medium text-sage-100 uppercase tracking-wide mb-1">Sta succedendo ora</p>
            <p className="text-base font-bold text-white">{lastReachedMilestone.label} raggiunti</p>
            <p className="text-sm text-sage-50 mt-1 leading-snug">{lastReachedMilestone.desc}</p>
          </div>
        )}

        {/* Prossimo — solo se ha smesso */}
        {smokeFreeSince && nextMilestone && (
          <div className="bg-white border border-gray-100 rounded-xl p-3 mb-3 flex items-start gap-3 shadow-sm">
            <span className="text-2xl mt-0.5">🎯</span>
            <div>
              <p className="text-sm font-semibold text-gray-700">Prossimo: {nextMilestone.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{nextMilestone.desc}</p>
              <p className="text-xs text-sage-500 mt-1 font-medium">tra {formatHoursLeft(nextHoursLeft)}</p>
            </div>
          </div>
        )}

        {/* Hint anteprima quando non ha ancora smesso */}
        {!smokeFreeSince && (
          <p className="text-xs text-gray-500 mb-2 px-1">
            Ecco cosa guadagneresti smettendo:
          </p>
        )}

        {/* Timeline milestone — sempre visibile, earned solo se ha smesso */}
        <div className="space-y-2">
          {HEALTH_MILESTONES.map((m) => {
            const earned = smokeFreeSince ? hoursFree >= m.hours : false;
            return (
              <div
                key={m.hours}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${earned ? 'bg-sage-50' : 'bg-gray-50'}`}
              >
                <span className={`text-lg flex-shrink-0 ${earned ? '' : 'grayscale opacity-40'}`}>
                  {earned ? '✅' : '⏳'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${earned ? 'text-sage-700' : 'text-gray-600'}`}>{m.label}</p>
                  <p className={`text-xs ${earned ? 'text-sage-600' : 'text-gray-500'}`}>{m.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── RISPARMIO ── */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">💰 Risparmio</h2>
        <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm space-y-3">
          <div className="flex justify-between items-end">
            <div>
              <p className="text-xs text-gray-400">Giorni senza fumo registrati</p>
              <p className="text-2xl font-bold text-sage-600">{smokeFreeCount}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">Risparmio totale</p>
              <p className="text-2xl font-bold text-sage-600">€{totalSaved.toFixed(2)}</p>
            </div>
          </div>
          <p className="text-xs text-gray-400">
            Basato su {smokeFreeCount} {smokeFreeCount === 1 ? 'giornata' : 'giornate'} senza fumo × €{packPrice.toFixed(2)}/pacchetto
          </p>

          {smokeFreeCount === 0 && (
            <p className="text-xs text-gray-400 italic">
              Il risparmio si calcola automaticamente quando registri una giornata a 0 sigarette.
            </p>
          )}

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
              ) : daysToGoal > 0 ? (
                <p className="text-xs text-gray-400">
                  Raggiungerai l'obiettivo in circa{' '}
                  <span className="font-medium text-gray-600">{daysToGoal} giorni senza fumo</span>
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
              <button onClick={saveGoal} className="bg-sage-500 text-white px-4 py-2 rounded-lg text-sm font-medium">
                Salva
              </button>
              <button onClick={() => setEditingGoal(false)} className="text-gray-400 px-2 text-lg leading-none">✕</button>
            </div>
          )}
        </div>
      </section>

      {/* ── CALENDARIO ── */}
      <section className="pb-4">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">📅 Calendario</h2>
        <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setCalMonth(({ year, month }) => month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 })}
              className="text-gray-400 hover:text-gray-600 text-xl px-1"
            >‹</button>
            <span className="text-sm font-medium text-gray-700 capitalize">{monthName}</span>
            <button
              onClick={() => setCalMonth(({ year, month }) => month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 })}
              className="text-gray-400 hover:text-gray-600 text-xl px-1"
            >›</button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {['L', 'M', 'M', 'G', 'V', 'S', 'D'].map((d, i) => (
              <span key={i} className="text-xs text-gray-400 font-medium">{d}</span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calDays.map((d, i) => {
              const cls = dayColor(d);
              const tod = isToday(d);
              const ds = d ? `${calMonth.year}-${String(calMonth.month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}` : null;
              const cigs = ds ? cigsByDate[ds] : undefined;
              return (
                <div
                  key={i}
                  className={`aspect-square flex flex-col items-center justify-center rounded-lg text-xs font-medium select-none
                    ${cls} ${tod ? 'ring-2 ring-offset-1 ring-gray-400' : ''}`}
                >
                  <span>{d ?? ''}</span>
                  {cigs !== undefined && cigs > 0 && (
                    <span className="text-[9px] leading-none opacity-70">{cigs}</span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t border-gray-100">
            {[
              ['bg-sage-100 text-sage-700', '0 sig.'],
              ['bg-yellow-100 text-yellow-700', '1–5'],
              ['bg-orange-100 text-orange-700', '6–10'],
              ['bg-red-100 text-red-700', '10+'],
            ].map(([cls, lbl]) => (
              <div key={lbl} className="flex items-center gap-1.5 text-xs text-gray-500">
                <div className={`w-4 h-4 rounded-sm ${cls} flex items-center justify-center text-[9px]`} />
                {lbl}
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}
