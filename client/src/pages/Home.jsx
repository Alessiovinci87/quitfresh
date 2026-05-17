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
    <div className="mb-3 bg-white/70 backdrop-blur-md border border-gold-200/60 rounded-2xl px-4 py-3 flex items-start gap-2.5 shadow-glass">
      <span className="text-gold-600 text-sm mt-0.5">⚠</span>
      <div className="flex-1 text-xs text-sage-900">
        <p className="font-semibold tracking-tight">Verifica la tua email.</p>
        {resendStatus === 'sent' ? (
          <p className="mt-0.5 text-sage-700">Link inviato.</p>
        ) : resendStatus === 'error' ? (
          <p className="mt-0.5 text-terracotta-600">Errore. Riprova tra qualche minuto.</p>
        ) : (
          <button
            onClick={handleResendVerify}
            disabled={resendStatus === 'sending'}
            className="mt-0.5 underline text-sage-700 hover:text-sage-900 disabled:opacity-50"
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
        className="min-h-[calc(100dvh-7rem)] flex flex-col px-6 pt-6 animate-fade-in relative overflow-hidden"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1.5rem)' }}
      >
        {/* Sfondo decorativo: glow verde scuro + glow gold soft */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-32 -left-24 w-80 h-80 rounded-full bg-sage-700/10 blur-3xl" />
          <div className="absolute -bottom-24 -right-20 w-72 h-72 rounded-full bg-gold-300/15 blur-3xl" />
        </div>

        <div className="relative">
          {verifyBanner}
          <header className="mb-4">
            <p className="text-[10px] uppercase tracking-[0.24em] text-gold-600 font-semibold">Oggi</p>
            <h1 className="font-display text-[34px] font-semibold text-sage-900 truncate leading-tight mt-1 tracking-tight">
              {user.email.split('@')[0]}
            </h1>
          </header>

          <div className="flex-1 flex items-center justify-center">
            <div className="relative text-center py-16 px-6 rounded-3xl overflow-hidden bg-white/65 backdrop-blur-xl border border-sage-900/[0.06] shadow-glass w-full">
              <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_30%,rgba(201,169,110,0.10),transparent_65%)]" />
              <div className="relative">
                <p className="text-5xl mb-4">🌱</p>
                <p className="font-display text-2xl font-semibold text-sage-900 mb-1 tracking-tight">Quando vuoi, sei qui.</p>
                <p className="text-sm text-sage-700/80 mb-7">Ogni tentativo conta. Nessun giudizio.</p>
                <button
                  onClick={handleRestart}
                  disabled={restartLoading}
                  className="px-7 py-3.5 bg-gradient-to-br from-sage-700 to-sage-900 text-cream-50 rounded-2xl font-semibold text-sm shadow-glow disabled:opacity-60 transition-all active:scale-[0.98] hover:-translate-y-px"
                >
                  {restartLoading ? 'Avvio…' : 'Riparto adesso'}
                </button>
              </div>
            </div>
          </div>

          <button
            onClick={() => navigate('/craving')}
            className="w-full py-4 mt-6 mb-3 bg-gradient-to-br from-sage-700 to-sage-900 text-cream-50 rounded-2xl font-semibold text-base shadow-glow active:scale-[0.98] transition-all hover:-translate-y-px flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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

  // Phase corrente del protocollo citisina (se attivo). Serve per
  // mostrare il banner "Giorno 5" — punto chiave del foglietto.
  const phaseNow = user.cytisineStartDate
    ? getActivePhase(user.cytisineSchedule, user.cytisineStartDate)
    : null;

  return (
    <div
      className="min-h-[calc(100dvh-7rem)] flex flex-col px-6 pt-6 animate-fade-in relative overflow-hidden"
      style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1.5rem)' }}
    >
      {/* Sfondo "Premium Wellness": due glow morbidi, uno verde scuro
          in alto-sinistra e uno gold in basso-destra. Crea profondità
          senza appesantire. */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-32 w-96 h-96 rounded-full bg-sage-700/10 blur-3xl" />
        <div className="absolute -bottom-32 -right-24 w-80 h-80 rounded-full bg-gold-300/15 blur-3xl" />
      </div>

      <div className="relative flex-1 flex flex-col">
        {verifyBanner}

        {/* Header compatto */}
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.24em] text-gold-600 font-semibold">Oggi</p>
            <h1 className="font-display text-[26px] font-semibold text-sage-900 truncate leading-tight mt-1 tracking-tight">
              {user.email.split('@')[0]}
            </h1>
          </div>
          {progress?.freezesAvailable > 0 && (
            <button
              onClick={() => setShowStreakSheet(true)}
              className="shrink-0 inline-flex items-center gap-1.5 text-xs font-medium text-sage-800 bg-white/70 backdrop-blur-md border border-sage-900/[0.06] px-3 py-1.5 rounded-full shadow-glass active:scale-95 transition-all"
              aria-label={`${progress.freezesAvailable} freeze disponibili`}
            >
              <span>❄</span>
              <span className="tabular-nums">{progress.freezesAvailable}</span>
            </button>
          )}
        </header>

        {/* Ring centrale — tappable */}
        <div className="flex-1 flex flex-col items-center justify-center py-2">
          {loading ? (
            <div className="w-8 h-8 border-2 border-sage-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <button
                onClick={() => setShowStreakSheet(true)}
                className="group focus:outline-none"
                aria-label="Apri dettagli streak"
              >
                <ProgressRing value={days} max={ringTarget} size={240} stroke={10}>
                  <p className="font-display text-[88px] font-semibold text-sage-900 tabular-nums leading-none tracking-tighter transition-transform group-active:scale-[0.97]">
                    {days}
                  </p>
                  <p className="text-[11px] font-semibold text-gold-600 tracking-[0.18em] mt-2 uppercase">
                    {days === 1 ? 'giorno' : 'giorni'}
                  </p>
                  {nextBadge ? (
                    <p className="text-[10px] text-sage-700/70 mt-2">
                      {ringTarget - days} al traguardo
                    </p>
                  ) : (
                    <p className="text-[10px] text-sage-800 mt-2 font-medium">Tutti i traguardi ✓</p>
                  )}
                </ProgressRing>
              </button>

              <p className="mt-3 text-xs text-sage-700/70 tracking-tight">
                dal {progress?.quitDate
                  ? new Date(progress.quitDate).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })
                  : '—'}
              </p>

              <div className="mt-4 flex items-center gap-2 flex-wrap justify-center">
                {progress?.moneySaved > 0 && (
                  <span className="inline-flex items-center gap-1.5 bg-gradient-to-br from-gold-100 to-gold-200/70 border border-gold-300/50 px-3.5 py-2 rounded-full shadow-glow-gold text-sage-900">
                    <span className="text-base">💰</span>
                    <span className="font-display text-base font-semibold tabular-nums">€{progress.moneySaved.toFixed(2)}</span>
                    <span className="text-[11px] text-sage-700/80 font-medium">risparmiati</span>
                  </span>
                )}
                {progress?.bestDays > 0 && (
                  <span className="inline-flex items-center gap-1.5 bg-white/70 backdrop-blur-md border border-sage-900/[0.06] px-3.5 py-2 rounded-full shadow-glass text-sage-900">
                    <span className="text-gold-500">★</span>
                    <span className="text-[11px] font-medium">Record <span className="font-display font-semibold tabular-nums">{progress.bestDays}</span></span>
                  </span>
                )}
              </div>

              {/* Bottone esplicito per aprire lo Streak sheet */}
              <button
                onClick={() => setShowStreakSheet(true)}
                className="mt-5 inline-flex items-center gap-2 px-5 py-3 rounded-full bg-white/70 backdrop-blur-md border border-sage-900/[0.06] shadow-glass text-sm font-semibold text-sage-800 hover:bg-white/90 active:scale-95 transition-all"
              >
                <svg className="w-4 h-4 text-gold-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
                Traguardi e storia
                <svg className="w-4 h-4 text-sage-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}
        </div>

        {/* Banner giorno 5 citisina — punto chiave del protocollo Tabex/
            Sopharma. Solo se phaseNow.day === 5 (calcolato sopra). */}
        {phaseNow && phaseNow.day === 5 && <Day5Banner />}

        {/* Capsule oggi — compatta */}
        <CapsuleCompact user={user} onOpenDetails={() => setShowCapsuleDetails(true)} />

        {/* CTA */}
        <button
          onClick={() => navigate('/craving')}
          className="w-full py-4 mt-4 bg-gradient-to-br from-sage-700 to-sage-900 text-cream-50 rounded-2xl font-semibold text-base shadow-glow active:scale-[0.98] hover:-translate-y-px transition-all flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Ho bisogno ORA
        </button>

        <button
          onClick={() => setShowRelapseConfirm(true)}
          className="w-full py-2 mb-2 text-[11px] text-sage-600/60 hover:text-sage-700 transition-colors underline-offset-4 hover:underline"
        >
          Ho ceduto
        </button>
      </div>

      {/* Streak bottom-sheet: aggiusta giorni + badges + storia */}
      {showStreakSheet && (
        <StreakSheet
          progress={progress}
          days={days}
          adjusting={adjusting}
          onAdjust={adjustDays}
          onClose={() => setShowStreakSheet(false)}
        />
      )}

      {/* Relapse confirm modal */}
      {showRelapseConfirm && (
        <RelapseModal
          progress={progress}
          relapseLoading={relapseLoading}
          onClose={() => setShowRelapseConfirm(false)}
          onRelapse={handleRelapse}
          onUseFreeze={handleUseFreeze}
        />
      )}

      {/* Capsule details sub-page */}
      {showCapsuleDetails && (
        <CapsuleDetailsPage
          user={user}
          onClose={() => setShowCapsuleDetails(false)}
        />
      )}
    </div>
  );
}

// ── Day5Banner: banner solo il 5° giorno di terapia citisina ──
// Punto chiave del protocollo Tabex/Sopharma: il foglietto raccomanda
// di smettere di fumare entro il 5° giorno per massima efficacia.
function Day5Banner() {
  return (
    <div className="mt-5 mb-2 p-5 rounded-3xl bg-gradient-to-br from-gold-50 via-cream-50 to-sage-50 border border-gold-200/60 shadow-glow-gold relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-50 bg-[radial-gradient(circle_at_15%_30%,rgba(201,169,110,0.18),transparent_55%)]" />
      <div className="relative flex items-start gap-3">
        <div className="text-2xl shrink-0" aria-hidden>🌱</div>
        <div className="flex-1 min-w-0">
          <p className="font-display text-base font-semibold text-sage-900 leading-tight tracking-tight">
            Giorno 5: punto chiave
          </p>
          <p className="mt-2 text-[13px] text-sage-800 leading-relaxed">
            Sei al 5° giorno: il punto del protocollo in cui la citisina ti dà il massimo aiuto. Da oggi, ogni sigaretta in meno conta di più — è quanto indicato sul foglietto del produttore.
          </p>
          <p className="mt-2 text-[12px] text-sage-700/80 leading-relaxed">
            Hai dubbi? Il tuo medico è la voce giusta a cui chiedere.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── CapsuleCompact: card piccola con dots + bottoni +/- ──────
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
    <div className="bg-white/70 backdrop-blur-xl border border-sage-900/[0.06] rounded-3xl px-4 py-3 shadow-glass mt-4">
      <button
        onClick={onOpenDetails}
        className="w-full flex items-center justify-between mb-2 -mx-1 px-1 rounded-md hover:bg-sage-50/40 active:bg-sage-50 transition-colors"
        aria-label="Apri dettagli capsule"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-gold-100 to-gold-200/70 flex items-center justify-center text-xs">💊</span>
          <p className="text-[11px] uppercase tracking-[0.18em] text-gold-600 font-semibold">Capsule oggi</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] font-medium text-sage-800 bg-sage-50/80 px-2.5 py-1 rounded-full tabular-nums">
            Giorno {phase.day} · Fase {phase.index + 1}
          </span>
          <svg className="w-4 h-4 text-sage-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </button>

      {/* Pallini con orari sotto */}
      <div className="flex justify-around gap-2 mb-3">
        {doseTimes.map((t, i) => (
          <div key={t} className="flex flex-col items-center gap-1 min-w-0">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
              i < taken
                ? 'bg-gradient-to-br from-sage-700 to-sage-900 text-cream-50 shadow-glow'
                : 'bg-white/80 text-sage-500 border border-sage-200/70'
            }`}>
              {i < taken ? '✓' : i + 1}
            </div>
            <span className="text-[10px] text-sage-700/70 tabular-nums tracking-tight">{t}</span>
          </div>
        ))}
      </div>

      {/* Contatore +/- compatto */}
      <div className="flex items-center gap-3 pt-2 border-t border-sage-900/[0.05]">
        <button
          onClick={() => taken > 0 && updateCount(taken - 1)}
          disabled={taken <= 0 || saving}
          className="w-9 h-9 rounded-full bg-white border border-sage-200/70 text-sage-700 text-lg font-bold disabled:opacity-30 hover:bg-sage-50 transition-all flex items-center justify-center active:scale-95 shrink-0"
          aria-label="Togli capsula"
        >−</button>
        <div className="flex-1 text-center">
          <p className="text-[11px] text-sage-700/80">
            <span className="font-display text-base font-semibold text-sage-900 tabular-nums">{taken}</span>
            <span className="text-sage-500/70"> / {phase.pills}</span>
            <span className="text-sage-700/70 ml-2">
              {allTaken
                ? 'tutte prese ✓'
                : <>prossima alle <span className="font-semibold text-sage-900 tabular-nums">{nextTime}</span></>}
            </span>
          </p>
        </div>
        <button
          onClick={() => !allTaken && updateCount(taken + 1)}
          disabled={allTaken || saving}
          className="w-9 h-9 rounded-full bg-gradient-to-br from-sage-700 to-sage-900 text-cream-50 text-lg font-bold disabled:opacity-30 transition-all flex items-center justify-center shadow-glow active:scale-95 shrink-0"
          aria-label="Aggiungi capsula"
        >+</button>
      </div>
    </div>
  );
}

// ── CapsuleDetailsPage: sub-pagina full-screen con tutti gli orari ──
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

  // Lock body scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  if (!phase || !doseTimes) return null;
  const taken = pillsTaken ?? 0;

  return (
    <div
      className="fixed inset-0 z-50 bg-cream-50 animate-slide-in-right overflow-y-auto"
      style={{ animation: 'slideInRight 280ms cubic-bezier(0.16, 1, 0.3, 1)' }}
    >
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>

      {/* Sfondo glow soft */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -right-24 w-80 h-80 rounded-full bg-gold-300/15 blur-3xl" />
      </div>

      {/* Header sticky con tasto Indietro */}
      <header className="sticky top-0 z-10 px-6 pt-6 pb-3 bg-cream-50/80 backdrop-blur-xl border-b border-sage-900/[0.04] flex items-center gap-3">
        <button
          onClick={onClose}
          className="w-9 h-9 -ml-1 rounded-full flex items-center justify-center text-sage-700 hover:bg-sage-100/60 transition-colors active:scale-95"
          aria-label="Torna alla Home"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-[0.24em] text-gold-600 font-semibold">Protocollo</p>
          <h1 className="font-display text-2xl font-semibold text-sage-900 leading-tight tracking-tight">Capsule oggi</h1>
        </div>
      </header>

      <div className="relative px-6 py-5 space-y-5">
        {/* Status fase */}
        <div className="bg-white/70 backdrop-blur-xl border border-sage-900/[0.06] rounded-3xl p-5 shadow-glass">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] uppercase tracking-[0.18em] text-gold-600 font-semibold">Fase corrente</p>
            <span className="text-[10px] font-medium text-sage-800 bg-sage-50/80 px-2.5 py-1 rounded-full">
              Giorno {phase.day} · Fase {phase.index + 1}
            </span>
          </div>
          <p className="font-display text-2xl font-semibold text-sage-900 leading-tight tracking-tight">
            {phase.pills} {phase.pills === 1 ? 'capsula' : 'capsule'} al giorno
          </p>
          <p className="text-sm text-sage-700/70 mt-1">
            Una ogni {Math.round(phase.intervalMin / 60)} {phase.intervalMin / 60 === 1 ? 'ora' : 'ore'}
          </p>
        </div>

        {/* Timeline orari */}
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-gold-600 font-semibold mb-2 px-1">
            Orari di oggi
          </p>
          <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-sage-900/[0.06] shadow-glass overflow-hidden divide-y divide-sage-900/[0.04]">
            {doseTimes.map((time, i) => {
              const isPast = i < taken;
              return (
                <div
                  key={i}
                  className={`flex items-center gap-3 px-4 py-3.5 transition-all ${isPast ? 'bg-sage-50/40' : ''}`}
                >
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                    isPast
                      ? 'bg-gradient-to-br from-sage-700 to-sage-900 text-cream-50 shadow-glow'
                      : 'bg-white/80 text-sage-700 border border-sage-200/70'
                  }`}>
                    {isPast ? '✓' : i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-display text-base font-semibold text-sage-900 tabular-nums">
                      {time}
                    </p>
                    <p className="text-[11px] text-sage-700/70">
                      {isPast ? 'presa' : i === taken ? 'prossima' : 'in arrivo'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <p className="text-[11px] text-sage-600/60 px-1 leading-snug">
          Gli orari si calcolano dal primo dose-time impostato in Profilo e dal numero di capsule giornaliere della fase corrente.
        </p>
      </div>
    </div>
  );
}

// ── StreakSheet: bottom-sheet con aggiusta giorni + badges + storia ──
function StreakSheet({ progress, days, adjusting, onAdjust, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center animate-fade-in">
      <div
        className="absolute inset-0 bg-sage-900/45 backdrop-blur-md"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-mobile bg-cream-50/95 backdrop-blur-2xl rounded-t-[28px] shadow-lift animate-slide-up max-h-[85dvh] overflow-y-auto border-t border-x border-sage-900/[0.06]">
        <div className="sticky top-0 bg-cream-50/85 backdrop-blur-xl pt-3 pb-2 px-6 z-10 border-b border-sage-900/[0.04]">
          <div className="w-10 h-1 bg-sage-300/70 rounded-full mx-auto mb-3" />
          <div className="flex items-center justify-between">
            <h3 className="font-display text-xl font-semibold text-sage-900 tracking-tight">Streak</h3>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-sage-100/60 text-sage-700 flex items-center justify-center"
              aria-label="Chiudi"
            >✕</button>
          </div>
        </div>

        <div className="px-6 pb-6 space-y-5 pt-2">
          {/* Aggiusta giorni */}
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-gold-600 font-semibold mb-2">
              Aggiusta giorni
            </p>
            <div className="bg-white/70 backdrop-blur-xl border border-sage-900/[0.06] rounded-2xl p-4 flex items-center justify-between shadow-glass">
              <button
                onClick={() => onAdjust(-1)}
                disabled={adjusting || days <= 0}
                className="w-10 h-10 rounded-full bg-white border border-sage-200/70 text-sage-700 text-xl font-bold disabled:opacity-30 hover:bg-sage-50 transition-all flex items-center justify-center shadow-soft active:scale-95"
                aria-label="Diminuisci giorni"
              >−</button>
              <div className="text-center">
                <p className="font-display text-3xl font-semibold text-sage-900 tabular-nums leading-none tracking-tight">{days}</p>
                <p className="text-[10px] text-sage-600/70 mt-1 uppercase tracking-[0.18em]">
                  {days === 1 ? 'giorno' : 'giorni'}
                </p>
              </div>
              <button
                onClick={() => onAdjust(+1)}
                disabled={adjusting}
                className="w-10 h-10 rounded-full bg-gradient-to-br from-sage-700 to-sage-900 text-cream-50 text-xl font-bold disabled:opacity-30 transition-all flex items-center justify-center shadow-glow active:scale-95"
                aria-label="Aumenta giorni"
              >+</button>
            </div>
            <p className="text-[10px] text-sage-600/60 mt-2 leading-snug">
              Sposta la data di inizio se quella attuale non è precisa.
            </p>
          </div>

          {/* Badges */}
          {progress?.badges && (
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-gold-600 font-semibold mb-2">
                Traguardi
              </p>
              <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-sage-900/[0.06] overflow-hidden divide-y divide-sage-900/[0.04] shadow-glass">
                {progress.badges.map((badge) => (
                  <div
                    key={badge.id}
                    className={`flex items-center gap-3 px-4 py-3 transition-all ${badge.earned ? '' : 'opacity-50'}`}
                  >
                    <span className="text-xl shrink-0">{BADGE_EMOJI[badge.id] || '🎯'}</span>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-medium ${badge.earned ? 'text-sage-900' : 'text-sage-700/70'}`}>
                        {badge.label}
                      </p>
                      {!badge.earned && progress.daysSinceQuit < badge.days && (
                        <p className="text-[11px] text-sage-600/60">
                          Mancano {badge.days - progress.daysSinceQuit} giorni
                        </p>
                      )}
                    </div>
                    {badge.earned && (
                      <span className="text-[10px] text-gold-700 font-medium bg-gold-100/70 px-2.5 py-1 rounded-full shrink-0">
                        Raggiunto
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Freeze info */}
          {progress && (
            <div className="bg-white/70 backdrop-blur-xl border border-sage-900/[0.06] rounded-2xl p-4 flex items-center gap-3 shadow-glass">
              <span className="w-9 h-9 rounded-full bg-gradient-to-br from-gold-100 to-gold-200/70 flex items-center justify-center text-lg">❄</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sage-900">
                  {progress.freezesAvailable || 0} freeze disponibili
                </p>
                <p className="text-[11px] text-sage-700/70">
                  +1 ogni 7 giorni puliti
                  {progress.daysToNextFreeze != null && progress.freezesAvailable < 3
                    ? ` · prossimo tra ${progress.daysToNextFreeze} ${progress.daysToNextFreeze === 1 ? 'giorno' : 'giorni'}`
                    : ''}
                </p>
              </div>
            </div>
          )}

          {/* Past attempts */}
          {progress?.pastAttempts?.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-gold-600 font-semibold mb-2">
                Tentativi precedenti
              </p>
              <div className="space-y-2">
                {progress.pastAttempts.map((a, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-3 bg-white/70 backdrop-blur-xl border border-sage-900/[0.06] rounded-2xl shadow-glass">
                    <div className="min-w-0">
                      <p className="text-sm text-sage-900 font-medium">
                        {new Date(a.startDate).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                      <p className="text-[11px] text-sage-700/70 mt-0.5">
                        {a.endDate
                          ? `terminato il ${new Date(a.endDate).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}`
                          : 'in corso'}
                      </p>
                    </div>
                    <p className="font-display text-base font-semibold text-sage-900 tabular-nums">
                      {a.days !== null ? `${a.days}g` : '—'}
                      {a.days === progress.bestDays && progress.bestDays > 0 && (
                        <span className="ml-1 text-xs text-gold-500">★</span>
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
  );
}

// ── RelapseModal: invariato dal precedente ─────────────────────
function RelapseModal({ progress, relapseLoading, onClose, onRelapse, onUseFreeze }) {
  return (
    <div className="fixed inset-0 bg-sage-900/45 backdrop-blur-md flex items-end justify-center z-50 px-4 pb-8 animate-fade-in">
      <div className="bg-cream-50/95 backdrop-blur-2xl border border-sage-900/[0.06] rounded-3xl p-6 w-full max-w-mobile animate-slide-up shadow-lift">
        {progress?.freezesAvailable > 0 ? (
          <>
            <div className="flex items-center gap-3 mb-3">
              <span className="w-10 h-10 rounded-full bg-gradient-to-br from-gold-100 to-gold-200/70 flex items-center justify-center text-xl shadow-glow-gold">❄</span>
              <div>
                <h3 className="font-display text-xl font-semibold text-sage-900 leading-tight tracking-tight">Hai {progress.freezesAvailable} freeze</h3>
                <p className="text-[11px] text-sage-700/70 mt-0.5">Proteggi lo streak senza azzerarlo</p>
              </div>
            </div>
            <p className="text-sm text-sage-700/80 mb-5 leading-relaxed">
              Una giornata difficile non deve cancellare tutto il tuo percorso. Usa un freeze per non perdere lo streak.
            </p>
            <button
              onClick={onUseFreeze}
              disabled={relapseLoading}
              className="w-full py-3.5 bg-gradient-to-br from-sage-700 to-sage-900 text-cream-50 rounded-2xl font-semibold text-sm shadow-glow disabled:opacity-60 active:scale-[0.98] hover:-translate-y-px transition-all mb-2 flex items-center justify-center gap-2"
            >
              <span>❄</span>
              {relapseLoading ? 'Uso freeze…' : 'Usa un freeze'}
            </button>
            <button
              onClick={onRelapse}
              disabled={relapseLoading}
              className="w-full py-3 border border-terracotta-200 text-terracotta-700 rounded-2xl font-medium text-sm hover:bg-terracotta-50 disabled:opacity-60 transition-colors active:scale-[0.98] mb-2"
            >
              Azzera lo streak
            </button>
            <button
              onClick={onClose}
              className="w-full py-2 text-xs text-sage-600/70 hover:text-sage-700 transition-colors"
            >
              Annulla
            </button>
          </>
        ) : (
          <>
            <h3 className="font-display text-xl font-semibold text-sage-900 mb-2 tracking-tight">Azzerare il contatore?</h3>
            <p className="text-sm text-sage-700/80 mb-6 leading-relaxed">
              I giorni precedenti vengono salvati nella cronologia. Puoi ripartire quando sei pronto.
              {progress?.daysToNextFreeze != null && (
                <span className="block mt-2 text-[11px] text-sage-600/70">
                  ❄ Prossimo freeze tra {progress.daysToNextFreeze} {progress.daysToNextFreeze === 1 ? 'giorno' : 'giorni'} di streak pulito.
                </span>
              )}
            </p>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-3 border border-sage-200 text-sage-700 rounded-2xl font-medium text-sm hover:bg-sage-50 transition-colors active:scale-[0.98]"
              >
                Annulla
              </button>
              <button
                onClick={onRelapse}
                disabled={relapseLoading}
                className="flex-1 py-3 bg-terracotta-500 text-white rounded-2xl font-semibold text-sm hover:bg-terracotta-600 disabled:opacity-60 transition-colors active:scale-[0.98]"
              >
                {relapseLoading ? 'Azzeramento…' : 'Sì, azzera'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── ProgressRing: SVG con gradient sage scuro + accent gold ──
// Stroke più sottile (10) per look raffinato, gradient sage-600→sage-900,
// piccolo "tick" gold a metà ring quando si supera il 50% del target.
function ProgressRing({ value, max, size = 220, stroke = 10, children }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const ratio = max > 0 ? Math.min(value / max, 1) : 0;
  const offset = circumference * (1 - ratio);
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90 absolute inset-0">
        <defs>
          <linearGradient id="homeRingGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#516a4c" />
            <stop offset="60%" stopColor="#41553e" />
            <stop offset="100%" stopColor="#2c372c" />
          </linearGradient>
          <filter id="homeRingGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(65,85,62,0.10)"
          strokeWidth={stroke}
        />
        {/* Filled arc */}
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
