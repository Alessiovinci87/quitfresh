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
    if (cigs === undefined) return 'text-sage-600/30';
    if (cigs === 0) return 'bg-sage-100 text-sage-800';
    if (cigs <= 5) return 'bg-sage-200/80 text-sage-900';
    if (cigs <= 10) return 'bg-terracotta-100 text-terracotta-700';
    return 'bg-terracotta-200 text-terracotta-800';
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
    <div className="animate-fade-in">
      {/* Large title sticky */}
      <header className="sticky top-0 z-30 px-6 pt-6 pb-3 bg-cream-50/85 backdrop-blur-xl border-b border-sage-100/30">
        <p className="text-[10px] uppercase tracking-[0.2em] text-sage-600/70 font-semibold">Andamento</p>
        <h1 className="font-display text-3xl font-semibold text-sage-900 leading-tight mt-0.5">Statistiche</h1>
      </header>

      <div className="px-6 pt-6 pb-2 space-y-3">

      {/* ── TRACKER SIGARETTE ── */}
      <SectionCard
        title="Sigarette oggi"
        icon={
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h18M5 8v8m14-8v8" />
          </svg>
        }
      >
        <div className="flex items-center justify-between">
          <button
            onClick={() => changeCigs(-1)}
            disabled={todayCigs === 0 || savingCigs}
            className="w-10 h-10 rounded-full bg-white border border-sage-200/70 text-sage-700 text-xl font-bold disabled:opacity-30 active:scale-95 transition-all shadow-soft flex items-center justify-center"
            aria-label="Diminuisci"
          >−</button>
          <div className="text-center">
            <span className="font-display text-5xl font-semibold text-sage-900 tabular-nums leading-none">
              {todayCigs ?? '—'}
            </span>
            {savingCigs && <p className="text-[11px] text-sage-500/70 mt-1">salvataggio…</p>}
          </div>
          <button
            onClick={() => changeCigs(1)}
            disabled={savingCigs}
            className="w-10 h-10 rounded-full bg-gradient-to-br from-sage-500 to-sage-700 text-white text-xl font-bold disabled:opacity-30 active:scale-95 transition-all shadow-sage flex items-center justify-center"
            aria-label="Aumenta"
          >+</button>
        </div>
        {todayCigs === 0 && (
          <p className="text-center text-sm text-sage-700 font-medium mt-3 bg-sage-50 py-2 rounded-xl">
            🌟 Giornata senza fumo
          </p>
        )}
        {todayCigs > 0 && (
          <p className="text-center text-[11px] text-sage-600/60 mt-3">
            Registra ogni sigaretta per monitorare il percorso
          </p>
        )}

        {/* Grafico ultimi 14 giorni */}
        <div className="mt-4 pt-4 border-t border-sage-100/60">
          <p className="text-[10px] uppercase tracking-wider text-sage-600/70 font-semibold mb-3">Ultimi 14 giorni</p>
          <div className="flex items-end gap-1 h-20">
            {last14.map(({ ds, cigs }, i) => {
              const pct = cigs === null ? 0 : (cigs / maxCigs) * 100;
              const isUnknown = cigs === null;
              const isCurrentDay = ds === todayStr;
              const level =
                isUnknown ? 'unknown'
                : cigs === 0 ? 'free'
                : cigs <= 5 ? 'low'
                : cigs <= 10 ? 'mid'
                : 'high';
              const fill =
                level === 'unknown' ? 'bg-sage-100/60'
                : level === 'free' ? 'bg-gradient-to-t from-sage-400 to-sage-300'
                : level === 'low' ? 'bg-gradient-to-t from-sage-600 to-sage-500'
                : level === 'mid' ? 'bg-gradient-to-t from-terracotta-300 to-terracotta-200'
                : 'bg-gradient-to-t from-terracotta-500 to-terracotta-400';
              return (
                <div key={i} className="flex-1 flex flex-col items-center justify-end gap-0.5">
                  <div
                    className={`w-full rounded-t-md transition-all ${fill} ${isCurrentDay ? 'ring-2 ring-offset-1 ring-sage-400' : ''}`}
                    style={{ height: isUnknown ? '4px' : `${Math.max(10, pct)}%` }}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-[10px] text-sage-600/50 mt-1.5">
            <span>{new Date(last14[0].ds).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}</span>
            <span>oggi</span>
          </div>
          <div className="flex flex-wrap gap-3 mt-3">
            {[
              ['bg-gradient-to-t from-sage-400 to-sage-300', '0 sigarette'],
              ['bg-gradient-to-t from-sage-600 to-sage-500', '1–5'],
              ['bg-gradient-to-t from-terracotta-300 to-terracotta-200', '6–10'],
              ['bg-gradient-to-t from-terracotta-500 to-terracotta-400', '10+'],
            ].map(([cls, lbl]) => (
              <div key={lbl} className="flex items-center gap-1.5 text-[10px] text-sage-600/70">
                <div className={`w-2.5 h-2.5 rounded-sm ${cls}`} />
                {lbl}
              </div>
            ))}
          </div>
        </div>
      </SectionCard>

      {/* ── SALUTE NEL TEMPO ── */}
      <SectionCard
        title="Salute nel tempo"
        icon={
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        }
      >
        {/* CTA quit / badge non-fumo */}
        {!smokeFreeSince ? (
          <div className="space-y-3 mb-3">
            <p className="text-sm text-sage-700/80 leading-relaxed">
              Pronto a iniziare? Premi il pulsante quando smetti — il conteggio parte da subito.
            </p>
            {!showQuitForm ? (
              <div className="flex flex-col gap-2">
                <button
                  onClick={confirmQuitNow}
                  disabled={settingQuit}
                  className="w-full bg-gradient-to-br from-sage-500 to-sage-700 text-white py-3 rounded-xl-soft text-sm font-semibold active:scale-[0.98] transition-all disabled:opacity-50 shadow-sage"
                >
                  ✅ Ho smesso adesso
                </button>
                <button
                  onClick={() => { setQuitInput(nowLocalStr); setShowQuitForm(true); }}
                  className="w-full border border-sage-200 text-sage-700 py-3 rounded-xl-soft text-sm font-medium hover:bg-sage-50 transition-colors"
                >
                  Ho smesso prima — inserisci data
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-xs text-sage-600/70">Data e ora dell'ultima sigaretta</label>
                <input
                  type="datetime-local"
                  value={quitInput}
                  max={nowLocalStr}
                  onChange={e => setQuitInput(e.target.value)}
                  className="w-full border border-sage-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-400"
                />
                <div className="flex gap-2">
                  <button
                    onClick={confirmQuit}
                    disabled={settingQuit || !quitInput}
                    className="flex-1 bg-gradient-to-br from-sage-500 to-sage-700 text-white py-2 rounded-xl-soft text-sm font-semibold disabled:opacity-50 shadow-sage"
                  >
                    Conferma
                  </button>
                  <button onClick={() => setShowQuitForm(false)} className="text-sage-500 px-3 text-sm">
                    Annulla
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-sage-50 border border-sage-100 rounded-xl-soft px-4 py-3 mb-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-sage-600/70 font-semibold">Non fumo da</p>
              <p className="font-display text-base font-semibold text-sage-900 mt-0.5">
                {smokeFreeSince.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
                {' '}· {smokeFreeSince.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <button
              onClick={resetQuit}
              disabled={settingQuit}
              className="text-[11px] text-sage-600/70 hover:text-sage-700 underline underline-offset-2 ml-2"
            >
              Reimposta
            </button>
          </div>
        )}

        {/* Card 'sta succedendo ora' — solo se ha smesso e ha raggiunto qualcosa */}
        {smokeFreeSince && lastReachedMilestone && (
          <div className="relative overflow-hidden bg-gradient-to-br from-sage-600 to-sage-800 rounded-2xl-soft p-4 mb-3 shadow-sage">
            <div className="absolute inset-0 pointer-events-none opacity-30 bg-[radial-gradient(circle_at_85%_15%,rgba(255,255,255,0.18),transparent_55%)]" />
            <div className="relative">
              <p className="text-[10px] font-semibold text-sage-100 uppercase tracking-[0.18em] mb-1">Sta succedendo ora</p>
              <p className="font-display text-xl font-semibold text-white leading-tight">{lastReachedMilestone.label} raggiunti</p>
              <p className="text-sm text-sage-50/90 mt-1 leading-snug">{lastReachedMilestone.desc}</p>
            </div>
          </div>
        )}

        {/* Prossimo — solo se ha smesso */}
        {smokeFreeSince && nextMilestone && (
          <div className="bg-cream-100/80 border border-sage-100/60 rounded-xl-soft p-3 mb-3 flex items-start gap-3">
            <span className="w-9 h-9 rounded-lg bg-sage-50 flex items-center justify-center text-lg shrink-0">🎯</span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-sage-900">Prossimo: {nextMilestone.label}</p>
              <p className="text-xs text-sage-700/70 mt-0.5">{nextMilestone.desc}</p>
              <p className="text-[11px] text-sage-700 mt-1 font-medium">tra {formatHoursLeft(nextHoursLeft)}</p>
            </div>
          </div>
        )}

        {/* Hint anteprima quando non ha ancora smesso */}
        {!smokeFreeSince && (
          <p className="text-xs text-sage-600/70 mb-2 px-1 italic">
            Ecco cosa guadagneresti smettendo:
          </p>
        )}

        {/* Timeline milestone — lista divisa con divider */}
        <div className="bg-cream-50/60 rounded-xl-soft overflow-hidden divide-y divide-sage-100/40">
          {HEALTH_MILESTONES.map((m) => {
            const earned = smokeFreeSince ? hoursFree >= m.hours : false;
            return (
              <div
                key={m.hours}
                className={`flex items-center gap-3 px-3 py-2.5 ${earned ? '' : 'opacity-50'}`}
              >
                <span className="text-lg shrink-0">
                  {earned ? '✓' : '○'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${earned ? 'text-sage-900' : 'text-sage-700/70'}`}>{m.label}</p>
                  <p className={`text-[11px] ${earned ? 'text-sage-700/80' : 'text-sage-600/60'} leading-snug`}>{m.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>

      {/* ── RISPARMIO ── */}
      <SectionCard
        title="Risparmio"
        icon={
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
      >
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="bg-sage-50/60 rounded-xl px-3 py-3">
            <p className="text-[10px] uppercase tracking-wider text-sage-600/70 font-semibold mb-1">Giorni senza fumo</p>
            <p className="font-display text-2xl font-semibold text-sage-900 tabular-nums leading-tight">{smokeFreeCount}</p>
          </div>
          <div className="bg-sage-50/60 rounded-xl px-3 py-3">
            <p className="text-[10px] uppercase tracking-wider text-sage-600/70 font-semibold mb-1">Risparmio totale</p>
            <p className="font-display text-2xl font-semibold text-sage-900 tabular-nums leading-tight">€{totalSaved.toFixed(2)}</p>
          </div>
        </div>
        <p className="text-[11px] text-sage-600/60 leading-snug">
          {smokeFreeCount} {smokeFreeCount === 1 ? 'giornata' : 'giornate'} × €{packPrice.toFixed(2)}/pacchetto
        </p>

        {smokeFreeCount === 0 && (
          <p className="text-[11px] text-sage-600/60 italic mt-2">
            Il risparmio parte quando registri una giornata a 0 sigarette.
          </p>
        )}

        {goal > 0 && !editingGoal ? (
          <div className="mt-4 pt-4 border-t border-sage-100/60 space-y-2">
            <div>
              <div className="flex justify-between text-[11px] text-sage-600/70 mb-1.5">
                <span className="font-medium">Obiettivo: €{goal.toFixed(0)}</span>
                <span className="font-semibold text-sage-700">{goalPct.toFixed(0)}%</span>
              </div>
              <div className="w-full bg-sage-100/60 rounded-full h-2 overflow-hidden">
                <div
                  className="h-2 rounded-full transition-all duration-700 ease-out bg-gradient-to-r from-sage-500 to-sage-700"
                  style={{ width: `${goalPct}%` }}
                />
              </div>
            </div>
            {goalPct >= 100 ? (
              <p className="text-sm font-semibold text-sage-700 text-center bg-sage-50 py-2 rounded-xl">🎉 Obiettivo raggiunto</p>
            ) : daysToGoal > 0 ? (
              <p className="text-[11px] text-sage-600/70">
                Raggiungerai l'obiettivo in circa{' '}
                <span className="font-semibold text-sage-800">{daysToGoal} giorni</span>
              </p>
            ) : null}
            <button
              onClick={() => { setGoalInput(String(goal)); setEditingGoal(true); }}
              className="text-[11px] text-sage-600 hover:text-sage-700 underline underline-offset-2"
            >
              Modifica obiettivo
            </button>
          </div>
        ) : !editingGoal ? (
          <button
            onClick={() => setEditingGoal(true)}
            className="mt-4 w-full border border-dashed border-sage-300 rounded-xl-soft py-3 text-sm text-sage-700 hover:bg-sage-50 transition-colors font-medium"
          >
            + Imposta obiettivo di risparmio
          </button>
        ) : null}

        {editingGoal && (
          <div className="flex gap-2 mt-4">
            <input
              type="number"
              value={goalInput}
              onChange={e => setGoalInput(e.target.value)}
              placeholder="es. 500"
              className="flex-1 min-w-0 border border-sage-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-400"
              autoFocus
              onKeyDown={e => e.key === 'Enter' && saveGoal()}
            />
            <button onClick={saveGoal} className="bg-gradient-to-br from-sage-500 to-sage-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sage">
              Salva
            </button>
            <button onClick={() => setEditingGoal(false)} className="text-sage-500 px-2 text-lg leading-none">✕</button>
          </div>
        )}
      </SectionCard>

      {/* ── CALENDARIO ── */}
      <SectionCard
        title="Calendario"
        icon={
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        }
      >
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setCalMonth(({ year, month }) => month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 })}
            className="w-9 h-9 rounded-full hover:bg-sage-50 text-sage-700 transition-colors flex items-center justify-center text-xl"
            aria-label="Mese precedente"
          >‹</button>
          <span className="font-display text-base font-semibold text-sage-900 capitalize">{monthName}</span>
          <button
            onClick={() => setCalMonth(({ year, month }) => month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 })}
            className="w-9 h-9 rounded-full hover:bg-sage-50 text-sage-700 transition-colors flex items-center justify-center text-xl"
            aria-label="Mese successivo"
          >›</button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center mb-2">
          {['L', 'M', 'M', 'G', 'V', 'S', 'D'].map((d, i) => (
            <span key={i} className="text-[10px] uppercase tracking-wider text-sage-600/70 font-semibold">{d}</span>
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
                className={`aspect-square flex flex-col items-center justify-center rounded-lg text-xs font-medium select-none transition-all
                  ${cls} ${tod ? 'ring-2 ring-sage-500' : ''}`}
              >
                <span className="tabular-nums">{d ?? ''}</span>
                {cigs !== undefined && cigs > 0 && (
                  <span className="text-[9px] leading-none opacity-70 tabular-nums">{cigs}</span>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t border-sage-100/60">
          {[
            ['bg-sage-100 text-sage-700', '0 sig.'],
            ['bg-sage-200/80 text-sage-800', '1–5'],
            ['bg-terracotta-100 text-terracotta-700', '6–10'],
            ['bg-terracotta-200 text-terracotta-700', '10+'],
          ].map(([cls, lbl]) => (
            <div key={lbl} className="flex items-center gap-1.5 text-[10px] text-sage-600/70">
              <div className={`w-4 h-4 rounded-sm ${cls.split(' ')[0]}`} />
              {lbl}
            </div>
          ))}
        </div>
      </SectionCard>

      </div>
    </div>
  );
}

function SectionCard({ title, icon, children }) {
  return (
    <div className="bg-white rounded-2xl-soft shadow-soft border border-sage-100/60 overflow-hidden">
      <div className="px-4 pt-4 pb-3 flex items-center gap-2 text-sage-700">
        <span className="w-7 h-7 rounded-lg bg-sage-50 flex items-center justify-center">
          {icon}
        </span>
        <h2 className="text-sm font-semibold text-sage-900">{title}</h2>
      </div>
      <div className="px-4 pb-4">
        {children}
      </div>
    </div>
  );
}
