import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import SubPage from '../components/SubPage';

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
  const [todayCigs, setTodayCigs] = useState(null);
  const [savingCigs, setSavingCigs] = useState(false);
  const [subPage, setSubPage] = useState(null); // 'calendar' | 'health' | 'savings'

  const [goal, setGoal] = useState(() => parseFloat(localStorage.getItem('qf_savings_goal') || '0'));
  const [showQuitForm, setShowQuitForm] = useState(false);
  const [quitInput, setQuitInput] = useState('');
  const [settingQuit, setSettingQuit] = useState(false);

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

  const smokeFreeSince = progress?.smokeFreeSince ? new Date(progress.smokeFreeSince) : null;
  const hoursFree = smokeFreeSince ? (Date.now() - smokeFreeSince.getTime()) / (1000 * 60 * 60) : 0;
  const nextMilestone = HEALTH_MILESTONES.find(m => m.hours > hoursFree);
  const nextHoursLeft = nextMilestone ? nextMilestone.hours - hoursFree : 0;
  const lastReachedMilestone = [...HEALTH_MILESTONES].reverse().find(m => m.hours <= hoursFree);
  const packPrice = progress?.cigarettePackPrice ?? DEFAULT_PACK_PRICE;

  const smokeFreeCount = diaryEntries.filter(e => e.cigarettesToday === 0).length;
  const totalSaved = smokeFreeCount * packPrice;

  const monthName = new Date().toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
  const todayCalEntry = diaryEntries.find(e => toDateStr(new Date(e.date)) === todayStr);

  return (
    <div className="min-h-[calc(100dvh-7rem)] flex flex-col px-6 pt-6 animate-fade-in">
      <header className="mb-4">
        <p className="text-[10px] uppercase tracking-[0.2em] text-sage-600/70 font-semibold">Andamento</p>
        <h1 className="font-display text-3xl font-semibold text-sage-900 leading-tight mt-0.5">Statistiche</h1>
      </header>

      {/* Hero: tracker sigarette oggi */}
      <div className="bg-white rounded-2xl-soft shadow-soft border border-sage-100/60 p-4 mb-3">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-7 h-7 rounded-lg bg-sage-50 flex items-center justify-center">
            <svg className="w-4 h-4 text-sage-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h18M5 8v8m14-8v8" />
            </svg>
          </span>
          <p className="text-[11px] uppercase tracking-wider text-sage-600/70 font-semibold">Sigarette oggi</p>
        </div>
        <div className="flex items-center justify-between">
          <button
            onClick={() => changeCigs(-1)}
            disabled={todayCigs === 0 || savingCigs}
            className="w-10 h-10 rounded-full bg-white border border-sage-200 text-sage-700 text-xl font-bold disabled:opacity-30 hover:bg-sage-50 transition-all flex items-center justify-center shadow-soft active:scale-95"
            aria-label="Diminuisci"
          >−</button>
          <div className="text-center">
            <span className="font-display text-5xl font-semibold text-sage-900 tabular-nums leading-none">
              {todayCigs ?? '—'}
            </span>
            {savingCigs && <p className="text-[10px] text-sage-500/70 mt-1">salvataggio…</p>}
          </div>
          <button
            onClick={() => changeCigs(1)}
            disabled={savingCigs}
            className="w-10 h-10 rounded-full bg-gradient-to-br from-sage-500 to-sage-700 text-white text-xl font-bold disabled:opacity-30 transition-all flex items-center justify-center shadow-sage active:scale-95"
            aria-label="Aumenta"
          >+</button>
        </div>
        {todayCigs === 0 && (
          <p className="text-center text-xs text-sage-700 font-medium mt-2 bg-sage-50 py-1.5 rounded-lg">
            🌟 Giornata senza fumo
          </p>
        )}
      </div>

      {/* Chart 14g — istogramma sigarette per giorno */}
      <div className="bg-white rounded-2xl-soft shadow-soft border border-sage-100/60 p-4 mb-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] uppercase tracking-wider text-sage-600/70 font-semibold">Ultimi 14 giorni</p>
          <p className="text-[10px] text-sage-600/70">sigarette/giorno</p>
        </div>
        <div className="flex items-end gap-1 h-16 mb-1.5">
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
                  style={{ height: isUnknown ? '4px' : `${Math.max(10, pct)}%`, minHeight: '4px' }}
                />
              </div>
            );
          })}
        </div>
        <div className="flex justify-between text-[10px] text-sage-600/70 tabular-nums">
          <span>{new Date(last14[0].ds).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}</span>
          <span>oggi</span>
        </div>
        <p className="text-[10px] text-sage-600/60 mt-2 leading-snug">
          Ogni barra è un giorno. Verde = 0 sigarette. Più alta la barra, più sigarette in quel giorno.
        </p>
      </div>

      {/* Row-cards navigabili */}
      <div className="space-y-2 flex-1">
        <NavRow
          icon="📅"
          title="Calendario"
          value={monthName}
          onClick={() => setSubPage('calendar')}
        />
        <NavRow
          icon="❤️"
          title="Salute nel tempo"
          value={smokeFreeSince
            ? (nextMilestone ? `Prossimo: ${nextMilestone.label}` : 'Tutti i traguardi ✓')
            : 'Imposta data'}
          onClick={() => setSubPage('health')}
        />
        <NavRow
          icon="💰"
          title="Risparmio"
          value={`€${totalSaved.toFixed(2)}`}
          highlight
          onClick={() => setSubPage('savings')}
        />
      </div>

      {/* Sub-pages */}
      {subPage === 'calendar' && (
        <CalendarSubPage
          diaryEntries={diaryEntries}
          onClose={() => setSubPage(null)}
        />
      )}
      {subPage === 'health' && (
        <HealthSubPage
          smokeFreeSince={smokeFreeSince}
          hoursFree={hoursFree}
          nextMilestone={nextMilestone}
          nextHoursLeft={nextHoursLeft}
          lastReachedMilestone={lastReachedMilestone}
          showQuitForm={showQuitForm}
          setShowQuitForm={setShowQuitForm}
          quitInput={quitInput}
          setQuitInput={setQuitInput}
          settingQuit={settingQuit}
          setSettingQuit={setSettingQuit}
          load={load}
          onClose={() => setSubPage(null)}
        />
      )}
      {subPage === 'savings' && (
        <SavingsSubPage
          smokeFreeCount={smokeFreeCount}
          totalSaved={totalSaved}
          packPrice={packPrice}
          goal={goal}
          setGoal={setGoal}
          onClose={() => setSubPage(null)}
        />
      )}
    </div>
  );
}

// ── NavRow: riga cliccabile stile iOS settings ──────────────────
function NavRow({ icon, title, value, highlight, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full bg-white rounded-2xl-soft border border-sage-100/60 shadow-soft px-4 py-3.5 flex items-center gap-3 active:bg-sage-50/40 transition-colors`}
    >
      <span className="w-10 h-10 rounded-xl bg-sage-50 flex items-center justify-center text-xl shrink-0">
        {icon}
      </span>
      <div className="flex-1 min-w-0 text-left">
        <p className="font-display text-base font-semibold text-sage-900 leading-tight">{title}</p>
        <p className={`text-[11px] mt-0.5 ${highlight ? 'text-sage-700 font-medium' : 'text-sage-600/70'} truncate`}>
          {value}
        </p>
      </div>
      <svg className="w-5 h-5 text-sage-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </button>
  );
}

// ── CalendarSubPage ────────────────────────────────────────────
function CalendarSubPage({ diaryEntries, onClose }) {
  const [calMonth, setCalMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

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

  return (
    <SubPage eyebrow="Andamento" title="Calendario" onClose={onClose}>
      <div className="bg-white rounded-2xl-soft shadow-soft border border-sage-100/60 p-4">
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
                className={`aspect-square flex flex-col items-center justify-center rounded-lg text-xs font-medium select-none transition-all ${cls} ${tod ? 'ring-2 ring-sage-500' : ''}`}
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
            ['bg-sage-100', '0 sig.'],
            ['bg-sage-200/80', '1–5'],
            ['bg-terracotta-100', '6–10'],
            ['bg-terracotta-200', '10+'],
          ].map(([cls, lbl]) => (
            <div key={lbl} className="flex items-center gap-1.5 text-[10px] text-sage-600/70">
              <div className={`w-4 h-4 rounded-sm ${cls}`} />
              {lbl}
            </div>
          ))}
        </div>
      </div>
    </SubPage>
  );
}

// ── HealthSubPage ────────────────────────────────────────────────
function HealthSubPage({
  smokeFreeSince, hoursFree, nextMilestone, nextHoursLeft, lastReachedMilestone,
  showQuitForm, setShowQuitForm, quitInput, setQuitInput, settingQuit, setSettingQuit,
  load, onClose,
}) {
  const nowLocalStr = (() => {
    const n = new Date();
    n.setSeconds(0, 0);
    return n.toISOString().slice(0, 16);
  })();

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

  return (
    <SubPage eyebrow="Andamento" title="Salute nel tempo" onClose={onClose}>
      <div className="space-y-4">
        {/* CTA quit / status */}
        {!smokeFreeSince ? (
          <div className="bg-white border border-sage-100 rounded-2xl-soft shadow-soft p-4 space-y-3">
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
          <div className="bg-sage-50 border border-sage-100 rounded-xl-soft px-4 py-3 flex items-center justify-between">
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
              className="text-[11px] text-sage-600/70 hover:text-sage-700 underline ml-2"
            >
              Reimposta
            </button>
          </div>
        )}

        {/* Sta succedendo ora */}
        {smokeFreeSince && lastReachedMilestone && (
          <div className="relative overflow-hidden bg-gradient-to-br from-sage-600 to-sage-800 rounded-2xl-soft p-4 shadow-sage">
            <div className="absolute inset-0 pointer-events-none opacity-30 bg-[radial-gradient(circle_at_85%_15%,rgba(255,255,255,0.18),transparent_55%)]" />
            <div className="relative">
              <p className="text-[10px] font-semibold text-sage-100 uppercase tracking-[0.18em] mb-1">Sta succedendo ora</p>
              <p className="font-display text-xl font-semibold text-white leading-tight">{lastReachedMilestone.label} raggiunti</p>
              <p className="text-sm text-sage-50/90 mt-1 leading-snug">{lastReachedMilestone.desc}</p>
            </div>
          </div>
        )}

        {/* Prossimo */}
        {smokeFreeSince && nextMilestone && (
          <div className="bg-cream-100/80 border border-sage-100/60 rounded-xl-soft p-3 flex items-start gap-3">
            <span className="w-9 h-9 rounded-lg bg-sage-50 flex items-center justify-center text-lg shrink-0">🎯</span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-sage-900">Prossimo: {nextMilestone.label}</p>
              <p className="text-xs text-sage-700/70 mt-0.5">{nextMilestone.desc}</p>
              <p className="text-[11px] text-sage-700 mt-1 font-medium">tra {formatHoursLeft(nextHoursLeft)}</p>
            </div>
          </div>
        )}

        {/* Timeline milestones */}
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-sage-600/70 font-semibold mb-2 px-1">
            Tutti i traguardi
          </p>
          <div className="bg-white rounded-2xl-soft border border-sage-100 shadow-soft overflow-hidden divide-y divide-sage-100/60">
            {HEALTH_MILESTONES.map((m) => {
              const earned = smokeFreeSince ? hoursFree >= m.hours : false;
              return (
                <div
                  key={m.hours}
                  className={`flex items-center gap-3 px-4 py-3 ${earned ? '' : 'opacity-50'}`}
                >
                  <span className="text-lg shrink-0">{earned ? '✓' : '○'}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${earned ? 'text-sage-900' : 'text-sage-700/70'}`}>{m.label}</p>
                    <p className={`text-[11px] ${earned ? 'text-sage-700/80' : 'text-sage-600/60'} leading-snug`}>{m.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </SubPage>
  );
}

// ── SavingsSubPage ───────────────────────────────────────────────
function SavingsSubPage({ smokeFreeCount, totalSaved, packPrice, goal, setGoal, onClose }) {
  const [goalInput, setGoalInput] = useState('');
  const [editingGoal, setEditingGoal] = useState(false);

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

  return (
    <SubPage eyebrow="Andamento" title="Risparmio" onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-sage-50/60 rounded-xl-soft p-4">
            <p className="text-[10px] uppercase tracking-wider text-sage-600/70 font-semibold mb-1">Giorni senza fumo</p>
            <p className="font-display text-3xl font-semibold text-sage-900 tabular-nums leading-tight">{smokeFreeCount}</p>
          </div>
          <div className="bg-sage-50/60 rounded-xl-soft p-4">
            <p className="text-[10px] uppercase tracking-wider text-sage-600/70 font-semibold mb-1">Risparmio totale</p>
            <p className="font-display text-3xl font-semibold text-sage-900 tabular-nums leading-tight">€{totalSaved.toFixed(2)}</p>
          </div>
        </div>

        <p className="text-[11px] text-sage-600/70 leading-snug px-1">
          {smokeFreeCount} {smokeFreeCount === 1 ? 'giornata' : 'giornate'} × €{packPrice.toFixed(2)}/pacchetto
        </p>

        {/* Obiettivo */}
        <div className="bg-white rounded-2xl-soft shadow-soft border border-sage-100/60 p-4">
          <p className="text-[10px] uppercase tracking-[0.18em] text-sage-600/70 font-semibold mb-2">Obiettivo</p>

          {goal > 0 && !editingGoal ? (
            <>
              <div className="flex justify-between text-[11px] text-sage-600/70 mb-1.5">
                <span className="font-medium">€{goal.toFixed(0)}</span>
                <span className="font-semibold text-sage-700">{goalPct.toFixed(0)}%</span>
              </div>
              <div className="w-full bg-sage-100/60 rounded-full h-2 overflow-hidden mb-3">
                <div
                  className="h-2 rounded-full transition-all duration-700 ease-out bg-gradient-to-r from-sage-500 to-sage-700"
                  style={{ width: `${goalPct}%` }}
                />
              </div>
              {goalPct >= 100 ? (
                <p className="text-sm font-semibold text-sage-700 text-center bg-sage-50 py-2 rounded-xl mb-2">🎉 Obiettivo raggiunto</p>
              ) : daysToGoal > 0 ? (
                <p className="text-[11px] text-sage-600/70 mb-2">
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
            </>
          ) : !editingGoal ? (
            <button
              onClick={() => setEditingGoal(true)}
              className="w-full border border-dashed border-sage-300 rounded-xl-soft py-3 text-sm text-sage-700 hover:bg-sage-50 transition-colors font-medium"
            >
              + Imposta obiettivo
            </button>
          ) : (
            <div className="flex gap-2">
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
        </div>
      </div>
    </SubPage>
  );
}
