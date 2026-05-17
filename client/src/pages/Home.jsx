import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { getActivePhase, getDoseTimes } from '../lib/cytisine';

const BADGE_EMOJI = {
  day1: '🌱', day3: '🌿', week1: '⭐', day14: '🌟', month1: '🏅', month3: '🏆',
};

function getTodayStr() {
  const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Rome' }));
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// Sfondo cinematic riusato in tutti gli stati. 3 blob colorati blurred
// animati lentamente (60s) + noise overlay sottile per spezzare il
// banding del gradient. È pure CSS, zero JS.
function EclipseBackground() {
  return (
    <>
      <div className="eclipse-blob eclipse-blob-1 animate-mesh-drift" style={{ animationDelay: '0s' }} />
      <div className="eclipse-blob eclipse-blob-2 animate-mesh-drift" style={{ animationDelay: '-20s' }} />
      <div className="eclipse-blob eclipse-blob-3 animate-mesh-drift" style={{ animationDelay: '-40s' }} />
      <div className="eclipse-noise" />
    </>
  );
}

export default function Home() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showRelapseConfirm, setShowRelapseConfirm] = useState(false);
  const [showStreakSheet, setShowStreakSheet] = useState(false);
  const [showCapsuleDetails, setShowCapsuleDetails] = useState(false);
  const [relapseLoading, setRelapseLoading] = useState(false);
  const [restartLoading, setRestartLoading] = useState(false);
  const [adjusting, setAdjusting] = useState(false);
  const [resendStatus, setResendStatus] = useState('idle');

  async function handleResendVerify() {
    setResendStatus('sending');
    try {
      await api.auth.resendVerify();
      setResendStatus('sent');
    } catch {
      setResendStatus('error');
    }
  }

  const verifyBanner = !user.emailVerified ? (
    <div className="mb-3 eclipse-glass rounded-2xl px-4 py-3 flex items-start gap-2.5">
      <span className="text-neon-500 text-sm mt-0.5">⚠</span>
      <div className="flex-1 text-xs text-neon-300">
        <p className="font-semibold tracking-tight text-white/90">Verifica la tua email.</p>
        {resendStatus === 'sent' ? (
          <p className="mt-0.5 text-neon-400">Link inviato.</p>
        ) : resendStatus === 'error' ? (
          <p className="mt-0.5 text-terracotta-400">Errore. Riprova tra qualche minuto.</p>
        ) : (
          <button
            onClick={handleResendVerify}
            disabled={resendStatus === 'sending'}
            className="mt-0.5 underline text-neon-400 hover:text-neon-500 disabled:opacity-50"
          >
            {resendStatus === 'sending' ? 'Invio…' : 'Reinvia link'}
          </button>
        )}
      </div>
    </div>
  ) : null;

  useEffect(() => {
    if (!user.quitDate) { setLoading(false); return; }
    api.progress.get()
      .then(setProgress)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user.quitDate]);

  async function adjustDays(delta) {
    if (adjusting) return;
    const current = progress?.daysSinceQuit ?? 0;
    const next = current + delta;
    if (next < 0) return;
    setAdjusting(true);
    try {
      const newQuitDate = new Date(Date.now() - next * 86400000).toISOString();
      const { user: updated } = await api.quiz.setQuitDate(newQuitDate);
      updateUser(updated);
      setProgress(p => ({ ...p, daysSinceQuit: next }));
    } catch (err) {
      console.error(err);
    } finally {
      setAdjusting(false);
    }
  }

  async function handleRelapse() {
    setRelapseLoading(true);
    try {
      const { user: updated } = await api.relapse.log();
      updateUser(updated);
      setProgress(null);
      setShowRelapseConfirm(false);
    } catch (err) {
      console.error(err);
    } finally {
      setRelapseLoading(false);
    }
  }

  async function handleUseFreeze() {
    setRelapseLoading(true);
    try {
      const { user: updated } = await api.relapse.useFreeze();
      updateUser(updated);
      const p = await api.progress.get();
      setProgress(p);
      setShowRelapseConfirm(false);
    } catch (err) {
      console.error(err);
    } finally {
      setRelapseLoading(false);
    }
  }

  async function handleRestart() {
    setRestartLoading(true);
    try {
      const { user: updated } = await api.relapse.restart();
      updateUser(updated);
      setLoading(true);
      const p = await api.progress.get();
      setProgress(p);
    } catch (err) {
      console.error(err);
    } finally {
      setRestartLoading(false);
      setLoading(false);
    }
  }

  // ── Stato: nessuna data di quit impostata ──────────────────
  if (!user.quitDate && !loading) {
    return (
      <div
        className="eclipse-bg min-h-[calc(100dvh-7rem)] flex flex-col px-6 pt-6 animate-fade-in"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1.5rem)' }}
      >
        <EclipseBackground />
        <div className="relative z-10 flex-1 flex flex-col">
          {verifyBanner}
          <header className="mb-4">
            <p className="text-[10px] uppercase tracking-[0.32em] text-neon-400 font-bold">★ ECLIPSE</p>
            <h1 className="font-display text-[40px] font-semibold text-white truncate leading-[0.95] mt-2 tracking-tighter">
              {user.email.split('@')[0]}
            </h1>
          </header>

          <div className="flex-1 flex items-center justify-center">
            <div className="relative text-center py-16 px-6 rounded-3xl overflow-hidden eclipse-glass w-full">
              <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_30%,rgba(34,255,136,0.12),transparent_60%)]" />
              <div className="relative">
                <p className="text-6xl mb-4 animate-neon-pulse">🌱</p>
                <p className="font-display text-3xl font-semibold text-white mb-2 tracking-tighter leading-none">Quando vuoi, sei qui.</p>
                <p className="text-sm text-neon-300/70 mb-8">Ogni tentativo conta. Nessun giudizio.</p>
                <button
                  onClick={handleRestart}
                  disabled={restartLoading}
                  className="px-8 py-3.5 bg-neon-500 text-night-950 rounded-full font-bold text-sm shadow-neon-strong disabled:opacity-60 transition-all active:scale-[0.97] hover:shadow-neon-strong hover:-translate-y-px tracking-wide uppercase"
                >
                  {restartLoading ? 'Avvio…' : 'Riparto adesso'}
                </button>
              </div>
            </div>
          </div>

          <button
            onClick={() => navigate('/craving')}
            className="w-full py-4 mt-6 mb-3 bg-neon-500 text-night-950 rounded-2xl font-bold text-base shadow-neon active:scale-[0.98] hover:shadow-neon-strong transition-all flex items-center justify-center gap-2 uppercase tracking-wide"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Ho bisogno ORA
          </button>
        </div>
      </div>
    );
  }

  // ── Stato principale ──────────────────────────────────────
  const days = progress?.daysSinceQuit ?? 0;
  const nextBadge = progress?.badges?.find((b) => !b.earned);
  const ringTarget = nextBadge?.days ?? Math.max(days + 1, 30);

  const phaseNow = user.cytisineStartDate
    ? getActivePhase(user.cytisineSchedule, user.cytisineStartDate)
    : null;

  return (
    <div
      className="eclipse-bg min-h-[calc(100dvh-7rem)] flex flex-col px-6 pt-6 animate-fade-in"
      style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1.5rem)' }}
    >
      <EclipseBackground />

      <div className="relative z-10 flex-1 flex flex-col">
        {verifyBanner}

        {/* Header */}
        <header className="flex items-start justify-between gap-3 mb-2">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.32em] text-neon-400 font-bold">★ ECLIPSE</p>
            <h1 className="font-display text-[28px] font-semibold text-white truncate leading-[0.95] mt-2 tracking-tighter">
              {user.email.split('@')[0]}
            </h1>
          </div>
          {progress?.freezesAvailable > 0 && (
            <button
              onClick={() => setShowStreakSheet(true)}
              className="shrink-0 inline-flex items-center gap-1.5 text-xs font-bold text-white eclipse-glass px-3 py-1.5 rounded-full active:scale-95 transition-all"
              aria-label={`${progress.freezesAvailable} freeze disponibili`}
            >
              <span>❄</span>
              <span className="tabular-nums">{progress.freezesAvailable}</span>
            </button>
          )}
        </header>

        {/* Ring centrale gigante */}
        <div className="flex-1 flex flex-col items-center justify-center py-2">
          {loading ? (
            <div className="w-8 h-8 border-2 border-neon-500 border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <button
                onClick={() => setShowStreakSheet(true)}
                className="group focus:outline-none"
                aria-label="Apri dettagli streak"
              >
                <ProgressRing value={days} max={ringTarget} size={260} stroke={6}>
                  <p className="eclipse-text-neon font-display text-[110px] font-bold tabular-nums leading-none tracking-tighter transition-transform group-active:scale-[0.97] animate-neon-pulse">
                    {days}
                  </p>
                  <p className="text-[10px] font-bold text-neon-400 tracking-[0.32em] mt-3 uppercase">
                    {days === 1 ? 'giorno' : 'giorni'}
                  </p>
                  {nextBadge ? (
                    <p className="text-[10px] text-neon-300/70 mt-2 tracking-wide">
                      {ringTarget - days} al traguardo
                    </p>
                  ) : (
                    <p className="text-[10px] text-neon-500 mt-2 font-bold uppercase tracking-wider">Tutti i traguardi ✓</p>
                  )}
                </ProgressRing>
              </button>

              <p className="mt-3 text-[11px] text-neon-300/60 uppercase tracking-[0.2em]">
                dal {progress?.quitDate
                  ? new Date(progress.quitDate).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
                  : '—'}
              </p>

              <div className="mt-5 flex items-center gap-2 flex-wrap justify-center">
                {progress?.moneySaved > 0 && (
                  <span className="inline-flex items-center gap-1.5 eclipse-glass-bright px-3.5 py-2 rounded-full text-white">
                    <span className="text-base">💰</span>
                    <span className="font-display text-base font-bold tabular-nums text-neon-500">€{progress.moneySaved.toFixed(2)}</span>
                    <span className="text-[10px] text-neon-300/80 font-bold uppercase tracking-wider">risparmiati</span>
                  </span>
                )}
                {progress?.bestDays > 0 && (
                  <span className="inline-flex items-center gap-1.5 eclipse-glass px-3.5 py-2 rounded-full text-white">
                    <span className="text-neon-500">★</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider">Record <span className="font-display font-bold tabular-nums text-neon-400">{progress.bestDays}</span></span>
                  </span>
                )}
              </div>

              {/* CTA "Traguardi e storia" */}
              <button
                onClick={() => setShowStreakSheet(true)}
                className="mt-6 inline-flex items-center gap-2 px-5 py-3 rounded-full eclipse-glass text-sm font-bold text-white hover:eclipse-glass-bright active:scale-95 transition-all uppercase tracking-wider"
              >
                <svg className="w-4 h-4 text-neon-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
                Traguardi
                <svg className="w-4 h-4 text-neon-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}
        </div>

        {phaseNow && phaseNow.day === 5 && <Day5Banner />}
        <CapsuleCompact user={user} onOpenDetails={() => setShowCapsuleDetails(true)} />

        {/* CTA primario */}
        <button
          onClick={() => navigate('/craving')}
          className="w-full py-4 mt-4 bg-neon-500 text-night-950 rounded-2xl font-bold text-base shadow-neon active:scale-[0.98] hover:shadow-neon-strong transition-all flex items-center justify-center gap-2 uppercase tracking-wide"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Ho bisogno ORA
        </button>

        <button
          onClick={() => setShowRelapseConfirm(true)}
          className="w-full py-2 mb-2 text-[11px] text-neon-300/50 hover:text-neon-300 transition-colors underline-offset-4 hover:underline uppercase tracking-widest"
        >
          Ho ceduto
        </button>
      </div>

      {showStreakSheet && (
        <StreakSheet
          progress={progress}
          days={days}
          adjusting={adjusting}
          onAdjust={adjustDays}
          onClose={() => setShowStreakSheet(false)}
        />
      )}

      {showRelapseConfirm && (
        <RelapseModal
          progress={progress}
          relapseLoading={relapseLoading}
          onClose={() => setShowRelapseConfirm(false)}
          onRelapse={handleRelapse}
          onUseFreeze={handleUseFreeze}
        />
      )}

      {showCapsuleDetails && (
        <CapsuleDetailsPage
          user={user}
          onClose={() => setShowCapsuleDetails(false)}
        />
      )}
    </div>
  );
}

function Day5Banner() {
  return (
    <div className="mt-5 mb-2 p-5 rounded-3xl eclipse-glass-bright relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_15%_30%,rgba(34,255,136,0.15),transparent_55%)]" />
      <div className="relative flex items-start gap-3">
        <div className="text-2xl shrink-0 animate-neon-pulse" aria-hidden>🌱</div>
        <div className="flex-1 min-w-0">
          <p className="font-display text-lg font-bold text-white leading-tight tracking-tight">
            Giorno 5 · punto chiave
          </p>
          <p className="mt-2 text-[13px] text-neon-300/80 leading-relaxed">
            Il 5° giorno è il punto del protocollo in cui la citisina ti dà il massimo aiuto. Da oggi, ogni sigaretta in meno conta di più — è quanto indicato sul foglietto del produttore.
          </p>
          <p className="mt-2 text-[12px] text-neon-300/60 leading-relaxed">
            Hai dubbi? Il tuo medico è la voce giusta a cui chiedere.
          </p>
        </div>
      </div>
    </div>
  );
}

function CapsuleCompact({ user, onOpenDetails }) {
  const [pillsTaken, setPillsTaken] = useState(null);
  const [saving, setSaving] = useState(false);

  const phase = user.cytisineStartDate
    ? getActivePhase(user.cytisineSchedule, user.cytisineStartDate)
    : null;
  const doseTimes = phase && user.firstDoseTime ? getDoseTimes(user.firstDoseTime, phase) : null;

  useEffect(() => {
    if (!phase || !doseTimes) return;
    const today = getTodayStr();
    api.diary.list()
      .then(entries => {
        const entry = entries.find(e => e.date?.startsWith(today));
        setPillsTaken(entry?.pillsTaken ?? 0);
      })
      .catch(() => setPillsTaken(0));
  }, []);

  async function updateCount(next) {
    if (saving) return;
    setSaving(true);
    try {
      const today = getTodayStr();
      await api.diary.save({ date: new Date(today).toISOString(), pillsTaken: next });
      setPillsTaken(next);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  if (!phase || !doseTimes) return null;
  const taken = pillsTaken ?? 0;
  const allTaken = taken >= phase.pills;
  const nextTime = !allTaken ? doseTimes[taken] : null;

  return (
    <div className="eclipse-glass rounded-3xl px-4 py-3 mt-4">
      <button
        onClick={onOpenDetails}
        className="w-full flex items-center justify-between mb-2 -mx-1 px-1 rounded-md hover:bg-white/5 active:bg-white/10 transition-colors"
        aria-label="Apri dettagli capsule"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-7 h-7 rounded-lg eclipse-glass-bright flex items-center justify-center text-xs">💊</span>
          <p className="text-[10px] uppercase tracking-[0.24em] text-neon-400 font-bold">Capsule oggi</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] font-bold text-white eclipse-glass-bright px-2.5 py-1 rounded-full tabular-nums uppercase tracking-wider">
            G{phase.day} · F{phase.index + 1}
          </span>
          <svg className="w-4 h-4 text-neon-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </button>

      <div className="flex justify-around gap-2 mb-3">
        {doseTimes.map((t, i) => (
          <div key={t} className="flex flex-col items-center gap-1 min-w-0">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
              i < taken
                ? 'bg-neon-500 text-night-950 shadow-neon-sm'
                : 'eclipse-glass text-neon-300/60'
            }`}>
              {i < taken ? '✓' : i + 1}
            </div>
            <span className="text-[9px] text-neon-300/50 tabular-nums tracking-tight uppercase">{t}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 pt-2 border-t border-white/[0.06]">
        <button
          onClick={() => taken > 0 && updateCount(taken - 1)}
          disabled={taken <= 0 || saving}
          className="w-9 h-9 rounded-full eclipse-glass text-white text-lg font-bold disabled:opacity-30 hover:eclipse-glass-bright transition-all flex items-center justify-center active:scale-95 shrink-0"
          aria-label="Togli capsula"
        >−</button>
        <div className="flex-1 text-center">
          <p className="text-[11px] text-neon-300/70">
            <span className="font-display text-lg font-bold text-white tabular-nums">{taken}</span>
            <span className="text-neon-300/40"> / {phase.pills}</span>
            <span className="text-neon-300/60 ml-2">
              {allTaken
                ? <span className="text-neon-500 font-bold uppercase tracking-wide">tutte ✓</span>
                : <>prossima alle <span className="font-bold text-neon-400 tabular-nums">{nextTime}</span></>}
            </span>
          </p>
        </div>
        <button
          onClick={() => !allTaken && updateCount(taken + 1)}
          disabled={allTaken || saving}
          className="w-9 h-9 rounded-full bg-neon-500 text-night-950 text-lg font-bold disabled:opacity-30 transition-all flex items-center justify-center shadow-neon active:scale-95 shrink-0"
          aria-label="Aggiungi capsula"
        >+</button>
      </div>
    </div>
  );
}

function CapsuleDetailsPage({ user, onClose }) {
  const [pillsTaken, setPillsTaken] = useState(null);

  const phase = user.cytisineStartDate
    ? getActivePhase(user.cytisineSchedule, user.cytisineStartDate)
    : null;
  const doseTimes = phase && user.firstDoseTime ? getDoseTimes(user.firstDoseTime, phase) : null;

  useEffect(() => {
    if (!phase || !doseTimes) return;
    const today = getTodayStr();
    api.diary.list()
      .then(entries => {
        const entry = entries.find(e => e.date?.startsWith(today));
        setPillsTaken(entry?.pillsTaken ?? 0);
      })
      .catch(() => setPillsTaken(0));
  }, []);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  if (!phase || !doseTimes) return null;
  const taken = pillsTaken ?? 0;

  return (
    <div
      className="eclipse-bg fixed inset-0 z-50 overflow-y-auto"
      style={{ animation: 'slideInRight 280ms cubic-bezier(0.16, 1, 0.3, 1)' }}
    >
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>

      <EclipseBackground />

      <header className="relative z-10 sticky top-0 px-6 pt-6 pb-3 bg-night-950/70 backdrop-blur-xl border-b border-white/[0.06] flex items-center gap-3">
        <button
          onClick={onClose}
          className="w-9 h-9 -ml-1 rounded-full eclipse-glass flex items-center justify-center text-neon-400 hover:eclipse-glass-bright transition-colors active:scale-95"
          aria-label="Torna alla Home"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-[0.32em] text-neon-400 font-bold">Protocollo</p>
          <h1 className="font-display text-2xl font-semibold text-white leading-tight tracking-tighter">Capsule oggi</h1>
        </div>
      </header>

      <div className="relative z-10 px-6 py-5 space-y-5">
        <div className="eclipse-glass rounded-3xl p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] uppercase tracking-[0.24em] text-neon-400 font-bold">Fase corrente</p>
            <span className="text-[10px] font-bold text-white eclipse-glass-bright px-2.5 py-1 rounded-full uppercase tracking-wider">
              G{phase.day} · F{phase.index + 1}
            </span>
          </div>
          <p className="font-display text-3xl font-semibold text-white leading-tight tracking-tighter">
            {phase.pills} {phase.pills === 1 ? 'capsula' : 'capsule'} al giorno
          </p>
          <p className="text-sm text-neon-300/70 mt-1">
            Una ogni {Math.round(phase.intervalMin / 60)} {phase.intervalMin / 60 === 1 ? 'ora' : 'ore'}
          </p>
        </div>

        <div>
          <p className="text-[10px] uppercase tracking-[0.24em] text-neon-400 font-bold mb-2 px-1">
            Orari di oggi
          </p>
          <div className="eclipse-glass rounded-3xl overflow-hidden divide-y divide-white/[0.06]">
            {doseTimes.map((time, i) => {
              const isPast = i < taken;
              return (
                <div
                  key={i}
                  className={`flex items-center gap-3 px-4 py-3.5 transition-all ${isPast ? 'bg-neon-500/[0.04]' : ''}`}
                >
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                    isPast
                      ? 'bg-neon-500 text-night-950 shadow-neon-sm'
                      : 'eclipse-glass-bright text-neon-300'
                  }`}>
                    {isPast ? '✓' : i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-display text-lg font-bold text-white tabular-nums">
                      {time}
                    </p>
                    <p className="text-[10px] text-neon-300/60 uppercase tracking-wider">
                      {isPast ? 'presa' : i === taken ? 'prossima' : 'in arrivo'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <p className="text-[11px] text-neon-300/50 px-1 leading-snug">
          Gli orari si calcolano dal primo dose-time impostato in Profilo e dal numero di capsule giornaliere della fase corrente.
        </p>
      </div>
    </div>
  );
}

function StreakSheet({ progress, days, adjusting, onAdjust, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center animate-fade-in">
      <div
        className="absolute inset-0 bg-night-950/70 backdrop-blur-md"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="eclipse-bg relative w-full max-w-mobile rounded-t-[32px] animate-slide-up max-h-[85dvh] overflow-y-auto border-t border-x border-neon-500/20">
        <EclipseBackground />
        <div className="relative z-10">
          <div className="sticky top-0 bg-night-950/85 backdrop-blur-xl pt-3 pb-2 px-6 z-10 border-b border-white/[0.06]">
            <div className="w-10 h-1 bg-neon-500/40 rounded-full mx-auto mb-3" />
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xl font-semibold text-white tracking-tighter">Streak</h3>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full eclipse-glass text-neon-400 flex items-center justify-center"
                aria-label="Chiudi"
              >✕</button>
            </div>
          </div>

          <div className="px-6 pb-6 space-y-5 pt-2">
            <div>
              <p className="text-[10px] uppercase tracking-[0.24em] text-neon-400 font-bold mb-2">
                Aggiusta giorni
              </p>
              <div className="eclipse-glass rounded-2xl p-4 flex items-center justify-between">
                <button
                  onClick={() => onAdjust(-1)}
                  disabled={adjusting || days <= 0}
                  className="w-10 h-10 rounded-full eclipse-glass text-white text-xl font-bold disabled:opacity-30 hover:eclipse-glass-bright transition-all flex items-center justify-center active:scale-95"
                  aria-label="Diminuisci giorni"
                >−</button>
                <div className="text-center">
                  <p className="eclipse-text-neon font-display text-4xl font-bold tabular-nums leading-none tracking-tighter">{days}</p>
                  <p className="text-[10px] text-neon-300/60 mt-1 uppercase tracking-[0.24em]">
                    {days === 1 ? 'giorno' : 'giorni'}
                  </p>
                </div>
                <button
                  onClick={() => onAdjust(+1)}
                  disabled={adjusting}
                  className="w-10 h-10 rounded-full bg-neon-500 text-night-950 text-xl font-bold disabled:opacity-30 transition-all flex items-center justify-center shadow-neon active:scale-95"
                  aria-label="Aumenta giorni"
                >+</button>
              </div>
              <p className="text-[10px] text-neon-300/50 mt-2 leading-snug">
                Sposta la data di inizio se quella attuale non è precisa.
              </p>
            </div>

            {progress?.badges && (
              <div>
                <p className="text-[10px] uppercase tracking-[0.24em] text-neon-400 font-bold mb-2">
                  Traguardi
                </p>
                <div className="eclipse-glass rounded-2xl overflow-hidden divide-y divide-white/[0.06]">
                  {progress.badges.map((badge) => (
                    <div
                      key={badge.id}
                      className={`flex items-center gap-3 px-4 py-3 transition-all ${badge.earned ? '' : 'opacity-40'}`}
                    >
                      <span className="text-xl shrink-0">{BADGE_EMOJI[badge.id] || '🎯'}</span>
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-bold ${badge.earned ? 'text-white' : 'text-neon-300/60'}`}>
                          {badge.label}
                        </p>
                        {!badge.earned && progress.daysSinceQuit < badge.days && (
                          <p className="text-[10px] text-neon-300/50 uppercase tracking-wide">
                            Mancano {badge.days - progress.daysSinceQuit} giorni
                          </p>
                        )}
                      </div>
                      {badge.earned && (
                        <span className="text-[10px] text-neon-500 font-bold bg-neon-500/15 px-2.5 py-1 rounded-full shrink-0 uppercase tracking-wider">
                          Done
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {progress && (
              <div className="eclipse-glass rounded-2xl p-4 flex items-center gap-3">
                <span className="w-9 h-9 rounded-full eclipse-glass-bright flex items-center justify-center text-lg">❄</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white">
                    {progress.freezesAvailable || 0} freeze disponibili
                  </p>
                  <p className="text-[10px] text-neon-300/60 uppercase tracking-wide">
                    +1 ogni 7 giorni puliti
                    {progress.daysToNextFreeze != null && progress.freezesAvailable < 3
                      ? ` · prossimo tra ${progress.daysToNextFreeze} ${progress.daysToNextFreeze === 1 ? 'giorno' : 'giorni'}`
                      : ''}
                  </p>
                </div>
              </div>
            )}

            {progress?.pastAttempts?.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-[0.24em] text-neon-400 font-bold mb-2">
                  Tentativi precedenti
                </p>
                <div className="space-y-2">
                  {progress.pastAttempts.map((a, i) => (
                    <div key={i} className="flex items-center justify-between px-4 py-3 eclipse-glass rounded-2xl">
                      <div className="min-w-0">
                        <p className="text-sm text-white font-bold">
                          {new Date(a.startDate).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                        <p className="text-[10px] text-neon-300/60 mt-0.5 uppercase tracking-wide">
                          {a.endDate
                            ? `terminato il ${new Date(a.endDate).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}`
                            : 'in corso'}
                        </p>
                      </div>
                      <p className="font-display text-xl font-bold text-neon-500 tabular-nums">
                        {a.days !== null ? `${a.days}g` : '—'}
                        {a.days === progress.bestDays && progress.bestDays > 0 && (
                          <span className="ml-1 text-xs text-neon-400">★</span>
                        )}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function RelapseModal({ progress, relapseLoading, onClose, onRelapse, onUseFreeze }) {
  return (
    <div className="fixed inset-0 bg-night-950/75 backdrop-blur-md flex items-end justify-center z-50 px-4 pb-8 animate-fade-in">
      <div className="eclipse-bg relative rounded-3xl p-6 w-full max-w-mobile animate-slide-up border border-neon-500/20 overflow-hidden">
        <EclipseBackground />
        <div className="relative z-10">
          {progress?.freezesAvailable > 0 ? (
            <>
              <div className="flex items-center gap-3 mb-3">
                <span className="w-10 h-10 rounded-full eclipse-glass-bright flex items-center justify-center text-xl shadow-neon-sm">❄</span>
                <div>
                  <h3 className="font-display text-xl font-semibold text-white leading-tight tracking-tighter">Hai {progress.freezesAvailable} freeze</h3>
                  <p className="text-[10px] text-neon-300/60 mt-0.5 uppercase tracking-wider">Proteggi lo streak</p>
                </div>
              </div>
              <p className="text-sm text-neon-300/80 mb-5 leading-relaxed">
                Una giornata difficile non deve cancellare tutto il tuo percorso. Usa un freeze per non perdere lo streak.
              </p>
              <button
                onClick={onUseFreeze}
                disabled={relapseLoading}
                className="w-full py-3.5 bg-neon-500 text-night-950 rounded-2xl font-bold text-sm shadow-neon disabled:opacity-60 active:scale-[0.98] transition-all mb-2 flex items-center justify-center gap-2 uppercase tracking-wide"
              >
                <span>❄</span>
                {relapseLoading ? 'Uso freeze…' : 'Usa un freeze'}
              </button>
              <button
                onClick={onRelapse}
                disabled={relapseLoading}
                className="w-full py-3 eclipse-glass text-terracotta-300 rounded-2xl font-bold text-sm hover:bg-terracotta-500/10 disabled:opacity-60 transition-colors active:scale-[0.98] mb-2 uppercase tracking-wide"
              >
                Azzera lo streak
              </button>
              <button
                onClick={onClose}
                className="w-full py-2 text-[10px] text-neon-300/50 hover:text-neon-300 transition-colors uppercase tracking-widest"
              >
                Annulla
              </button>
            </>
          ) : (
            <>
              <h3 className="font-display text-2xl font-semibold text-white mb-2 tracking-tighter">Azzerare il contatore?</h3>
              <p className="text-sm text-neon-300/80 mb-6 leading-relaxed">
                I giorni precedenti vengono salvati nella cronologia. Puoi ripartire quando sei pronto.
                {progress?.daysToNextFreeze != null && (
                  <span className="block mt-2 text-[10px] text-neon-300/60 uppercase tracking-wide">
                    ❄ Prossimo freeze tra {progress.daysToNextFreeze} {progress.daysToNextFreeze === 1 ? 'giorno' : 'giorni'} di streak pulito.
                  </span>
                )}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-3 eclipse-glass text-white rounded-2xl font-bold text-sm hover:eclipse-glass-bright transition-colors active:scale-[0.98] uppercase tracking-wide"
                >
                  Annulla
                </button>
                <button
                  onClick={onRelapse}
                  disabled={relapseLoading}
                  className="flex-1 py-3 bg-terracotta-500 text-white rounded-2xl font-bold text-sm hover:bg-terracotta-600 disabled:opacity-60 transition-colors active:scale-[0.98] uppercase tracking-wide"
                >
                  {relapseLoading ? 'Azzeramento…' : 'Sì, azzera'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ProgressRing — Eclipse: stroke ultra-sottile (6) + gradient neon
// brillante + glow filter molto presente. Track quasi invisibile.
function ProgressRing({ value, max, size = 220, stroke = 6, children }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const ratio = max > 0 ? Math.min(value / max, 1) : 0;
  const offset = circumference * (1 - ratio);
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90 absolute inset-0 overflow-visible">
        <defs>
          <linearGradient id="homeRingGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#22ff88" />
            <stop offset="60%" stopColor="#5eead4" />
            <stop offset="100%" stopColor="#a7f3d0" />
          </linearGradient>
          <filter id="homeRingGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(34, 255, 136, 0.08)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#homeRingGrad)"
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          filter="url(#homeRingGlow)"
          style={{ transition: 'stroke-dashoffset 900ms cubic-bezier(0.16, 1, 0.3, 1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
        {children}
      </div>
    </div>
  );
}
