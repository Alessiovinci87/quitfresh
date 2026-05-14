import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { getActivePhase, getDoseTimes } from '../lib/cytisine';
import InstallApp from '../components/InstallApp';

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
  const [relapseLoading, setRelapseLoading] = useState(false);
  const [restartLoading, setRestartLoading] = useState(false);

  const [adjusting, setAdjusting] = useState(false);
  const [resendStatus, setResendStatus] = useState('idle'); // idle | sending | sent | error

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
    <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-xl px-3 py-2.5 flex items-start gap-2">
      <span className="text-yellow-500 text-sm mt-0.5">⚠</span>
      <div className="flex-1 text-xs text-yellow-800">
        <p className="font-medium">Verifica la tua email per non perdere l'accesso.</p>
        {resendStatus === 'sent' ? (
          <p className="mt-0.5 text-yellow-700">Link inviato. Controlla la casella.</p>
        ) : resendStatus === 'error' ? (
          <p className="mt-0.5 text-red-600">Errore. Riprova tra qualche minuto.</p>
        ) : (
          <button
            onClick={handleResendVerify}
            disabled={resendStatus === 'sending'}
            className="mt-0.5 underline text-yellow-700 hover:text-yellow-900 disabled:opacity-50"
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
      // refresh progress per aggiornare freezesAvailable
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

  // Stato: nessuna data di quit impostata
  if (!user.quitDate && !loading) {
    return (
      <div className="px-6 py-8 animate-fade-in">
        <InstallApp mode="card" />
        {verifyBanner}
        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.18em] text-sage-600/70 font-medium">Bentornato</p>
          <h1 className="font-display text-3xl font-semibold text-sage-900 truncate leading-tight mt-1">
            {user.email.split('@')[0]}
          </h1>
        </div>

        <div className="relative text-center py-14 px-6 rounded-2xl-soft overflow-hidden bg-gradient-to-br from-sage-50 via-cream-50 to-sage-100 shadow-card mb-6">
          <div className="absolute inset-0 pointer-events-none opacity-60 bg-[radial-gradient(circle_at_50%_30%,rgba(104,131,97,0.15),transparent_60%)]" />
          <div className="relative">
            <p className="text-5xl mb-3">🌱</p>
            <p className="font-display text-xl font-semibold text-sage-900 mb-1">Quando vuoi ripartire, sei qui.</p>
            <p className="text-sm text-sage-700/80 mb-6">Ogni tentativo conta. Nessun giudizio.</p>
            <button
              onClick={handleRestart}
              disabled={restartLoading}
              className="px-6 py-3 bg-gradient-to-br from-sage-500 to-sage-700 text-white rounded-xl-soft font-semibold text-sm shadow-sage hover:from-sage-600 hover:to-sage-700 disabled:opacity-60 transition-all active:scale-[0.98]"
            >
              {restartLoading ? 'Avvio…' : 'Riparto adesso'}
            </button>
          </div>
        </div>

        {progress?.pastAttempts?.length > 0 && (
          <div className="mb-6">
            <PastAttempts attempts={progress.pastAttempts} bestDays={progress.bestDays} />
          </div>
        )}

        <button
          onClick={() => navigate('/craving')}
          className="w-full py-4 bg-gradient-to-br from-sage-500 to-sage-700 text-white rounded-2xl-soft font-semibold text-base tracking-wide shadow-sage hover:from-sage-600 hover:to-sage-700 active:scale-[0.98] transition-all"
        >
          Ho bisogno ORA
        </button>
      </div>
    );
  }

  const days = progress?.daysSinceQuit ?? 0;
  const nextBadge = progress?.badges?.find((b) => !b.earned);
  const ringTarget = nextBadge?.days ?? Math.max(days + 1, 30);
  const ringProgress = Math.min(days / ringTarget, 1);

  return (
    <div className="animate-fade-in">
      {/* Large title sticky — iOS style */}
      <header className="sticky top-0 z-30 px-6 pt-6 pb-3 bg-cream-50/85 backdrop-blur-xl border-b border-sage-100/30">
        <p className="text-[10px] uppercase tracking-[0.2em] text-sage-600/70 font-semibold">Oggi</p>
        <h1 className="font-display text-3xl font-semibold text-sage-900 truncate leading-tight mt-0.5">
          {user.email.split('@')[0]}
        </h1>
      </header>

      <div className="px-6 pt-6 pb-2">
        <InstallApp mode="card" />
        {verifyBanner}
      </div>

      {/* Hero — Progress Ring */}
      <div className="px-6 pb-6">
        <div className="relative flex flex-col items-center py-2">
          {loading ? (
            <div className="h-[240px] flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-sage-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <ProgressRing value={days} max={ringTarget} size={240} stroke={14}>
                <p className="font-display text-[72px] font-semibold text-sage-800 tabular-nums leading-none tracking-tight">
                  {days}
                </p>
                <p className="text-[11px] font-medium text-sage-600/80 tracking-wide mt-1 uppercase">
                  {days === 1 ? 'giorno' : 'giorni'}
                </p>
                {nextBadge ? (
                  <p className="text-[10px] text-sage-600/60 mt-1.5">
                    {ringTarget - days} al traguardo
                  </p>
                ) : (
                  <p className="text-[10px] text-sage-700 mt-1.5 font-medium">Tutti i traguardi ✓</p>
                )}
              </ProgressRing>

              <p className="mt-4 text-sm text-sage-700/80">
                dal {progress?.quitDate
                  ? new Date(progress.quitDate).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
                  : '—'}
              </p>

              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={() => adjustDays(-1)}
                  disabled={adjusting || days <= 0}
                  className="w-9 h-9 rounded-full bg-white border border-sage-200/70 text-sage-700 text-lg font-bold disabled:opacity-30 hover:bg-sage-50 transition-all flex items-center justify-center shadow-soft active:scale-95"
                  aria-label="Diminuisci giorni"
                >−</button>
                <span className="text-[11px] uppercase tracking-wider text-sage-600/70 font-medium">Aggiusta</span>
                <button
                  onClick={() => adjustDays(+1)}
                  disabled={adjusting}
                  className="w-9 h-9 rounded-full bg-white border border-sage-200/70 text-sage-700 text-lg font-bold disabled:opacity-30 hover:bg-sage-50 transition-all flex items-center justify-center shadow-soft active:scale-95"
                  aria-label="Aumenta giorni"
                >+</button>
              </div>

              <div className="mt-3 flex items-center justify-center gap-2 flex-wrap">
                {progress?.bestDays > 0 && (
                  <p className="inline-flex items-center gap-1.5 text-[11px] text-sage-700 bg-sage-50 border border-sage-100 px-2.5 py-1 rounded-full">
                    <span className="text-terracotta-500">★</span>
                    Record: {progress.bestDays} {progress.bestDays === 1 ? 'giorno' : 'giorni'}
                  </p>
                )}
                {progress?.freezesAvailable > 0 && (
                  <p className="inline-flex items-center gap-1.5 text-[11px] text-sage-800 bg-white border border-sage-200 px-2.5 py-1 rounded-full shadow-soft">
                    <span>❄</span>
                    {progress.freezesAvailable} {progress.freezesAvailable === 1 ? 'freeze' : 'freeze disponibili'}
                  </p>
                )}
                {progress?.daysToNextFreeze != null && progress?.freezesAvailable < 3 && (
                  <p className="inline-flex items-center gap-1.5 text-[10px] text-sage-600/70">
                    +1 freeze tra {progress.daysToNextFreeze} {progress.daysToNextFreeze === 1 ? 'giorno' : 'giorni'}
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* CTA primaria — floating sopra al contenuto */}
      <div className="px-6 mb-6">
        <button
          onClick={() => navigate('/craving')}
          className="w-full py-4 bg-gradient-to-br from-sage-500 to-sage-700 text-white rounded-2xl-soft font-semibold text-base tracking-wide shadow-sage hover:from-sage-600 hover:to-sage-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Ho bisogno ORA
        </button>
      </div>

      <div className="px-6 space-y-3 mb-6">
        {/* Card "Oggi" unificata: capsule + KPI */}
        {!loading && progress && (
          <SectionCard
            title="Capsule e statistiche"
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          >
            <CapsuleTracker user={user} embedded />
            <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-sage-100/60">
              <StatCard label="Sigarette evitate" value={progress.cigarettesAvoided} unit="" />
              <StatCard label="Risparmio" value={`€${progress.moneySaved.toFixed(2)}`} unit="" />
            </div>
          </SectionCard>
        )}
      </div>

      <div className="px-6 pb-2">
        {/* Relapse button — discreto */}
        <button
          onClick={() => setShowRelapseConfirm(true)}
          className="w-full py-2 text-xs text-sage-600/60 hover:text-sage-700 transition-colors mb-6 underline-offset-4 hover:underline"
        >
          Ho ceduto — vuoi azzerare il contatore?
        </button>

        {/* Badges */}
        {!loading && progress?.badges && (
          <div>
            <h2 className="text-[11px] font-semibold text-sage-600/70 uppercase tracking-[0.18em] mb-3 px-1">Traguardi</h2>
            <div className="bg-white rounded-xl-soft shadow-soft overflow-hidden divide-y divide-sage-100/60">
              {progress.badges.map((badge) => (
                <div
                  key={badge.id}
                  className={`flex items-center gap-3 px-4 py-3.5 transition-all ${
                    badge.earned ? '' : 'opacity-50'
                  }`}
                >
                  <span className="text-2xl shrink-0">{BADGE_EMOJI[badge.id] || '🎯'}</span>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-medium ${badge.earned ? 'text-sage-900' : 'text-sage-700/70'}`}>
                      {badge.label}
                    </p>
                    {!badge.earned && progress.daysSinceQuit < badge.days && (
                      <p className="text-xs text-sage-600/60 mt-0.5">
                        Mancano {badge.days - progress.daysSinceQuit} giorni
                      </p>
                    )}
                  </div>
                  {badge.earned && (
                    <span className="text-[11px] text-sage-700 font-medium bg-sage-50 px-2 py-0.5 rounded-full shrink-0">
                      Raggiunto
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Past attempts */}
        {!loading && progress?.pastAttempts?.length > 0 && (
          <div className="mt-6">
            <PastAttempts attempts={progress.pastAttempts} bestDays={progress.bestDays} />
          </div>
        )}
      </div>

      {/* Relapse confirm modal */}
      {showRelapseConfirm && (
        <div className="fixed inset-0 bg-sage-900/40 backdrop-blur-sm flex items-end justify-center z-50 px-4 pb-8 animate-fade-in">
          <div className="bg-white rounded-2xl-soft p-6 w-full max-w-mobile animate-slide-up shadow-lift">
            {progress?.freezesAvailable > 0 ? (
              <>
                <div className="flex items-center gap-3 mb-3">
                  <span className="w-10 h-10 rounded-full bg-sage-50 flex items-center justify-center text-xl">❄</span>
                  <div>
                    <h3 className="font-display text-xl font-semibold text-sage-900 leading-tight">Hai {progress.freezesAvailable} freeze</h3>
                    <p className="text-[11px] text-sage-600/70 mt-0.5">Proteggi lo streak senza azzerarlo</p>
                  </div>
                </div>
                <p className="text-sm text-sage-700/80 mb-5 leading-relaxed">
                  Una giornata difficile non deve cancellare tutto il tuo percorso. Usa un freeze per non perdere lo streak.
                </p>
                <button
                  onClick={handleUseFreeze}
                  disabled={relapseLoading}
                  className="w-full py-3.5 bg-gradient-to-br from-sage-500 to-sage-700 text-white rounded-xl-soft font-semibold text-sm shadow-sage disabled:opacity-60 active:scale-[0.98] transition-all mb-2 flex items-center justify-center gap-2"
                >
                  <span>❄</span>
                  {relapseLoading ? 'Uso freeze…' : 'Usa un freeze'}
                </button>
                <button
                  onClick={handleRelapse}
                  disabled={relapseLoading}
                  className="w-full py-3 border border-terracotta-200 text-terracotta-700 rounded-xl-soft font-medium text-sm hover:bg-terracotta-50 disabled:opacity-60 transition-colors active:scale-[0.98] mb-2"
                >
                  Azzera lo streak
                </button>
                <button
                  onClick={() => setShowRelapseConfirm(false)}
                  className="w-full py-2 text-xs text-sage-600/70 hover:text-sage-700 transition-colors"
                >
                  Annulla
                </button>
              </>
            ) : (
              <>
                <h3 className="font-display text-xl font-semibold text-sage-900 mb-2">Azzerare il contatore?</h3>
                <p className="text-sm text-sage-700/80 mb-6 leading-relaxed">
                  I giorni precedenti vengono salvati nella cronologia. Puoi ripartire quando sei pronto.
                  {progress?.daysToNextFreeze != null && (
                    <span className="block mt-2 text-[11px] text-sage-600/70">
                      ❄ Prossimo freeze disponibile tra {progress.daysToNextFreeze} {progress.daysToNextFreeze === 1 ? 'giorno' : 'giorni'} di streak pulito.
                    </span>
                  )}
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowRelapseConfirm(false)}
                    className="flex-1 py-3 border border-sage-200 text-sage-700 rounded-xl-soft font-medium text-sm hover:bg-sage-50 transition-colors active:scale-[0.98]"
                  >
                    Annulla
                  </button>
                  <button
                    onClick={handleRelapse}
                    disabled={relapseLoading}
                    className="flex-1 py-3 bg-terracotta-500 text-white rounded-xl-soft font-semibold text-sm hover:bg-terracotta-600 disabled:opacity-60 transition-colors active:scale-[0.98]"
                  >
                    {relapseLoading ? 'Azzeramento…' : 'Sì, azzera'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CapsuleTracker({ user, embedded = false }) {
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

  const content = (
    <>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] uppercase tracking-wider text-sage-600/70 font-semibold">Capsule oggi</p>
        <span className="text-[10px] font-medium text-sage-700 bg-sage-50 px-2 py-0.5 rounded-full">
          Giorno {phase.day} · Fase {phase.index + 1}
        </span>
      </div>

      {/* Dosi visuali */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {doseTimes.map((t, i) => (
          <div key={t} className="flex flex-col items-center gap-1 min-w-[2.5rem]">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
              i < taken
                ? 'bg-gradient-to-br from-sage-500 to-sage-700 text-white shadow-sage'
                : 'bg-sage-50 text-sage-400 border border-sage-100'
            }`}>
              {i < taken ? '✓' : i + 1}
            </div>
            <span className="text-[10px] text-sage-600/70">{t}</span>
          </div>
        ))}
      </div>

      {/* Contatore +/− */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => taken > 0 && updateCount(taken - 1)}
          disabled={taken <= 0 || saving}
          className="w-9 h-9 rounded-full border border-sage-200/70 text-sage-700 text-lg font-bold disabled:opacity-30 hover:bg-sage-50 transition-all flex items-center justify-center active:scale-95"
          aria-label="Togli capsula"
        >−</button>
        <div className="flex-1 text-center">
          <p className="font-display text-xl font-semibold text-sage-800 tabular-nums">
            {pillsTaken === null ? '…' : taken}
            <span className="text-sm font-normal text-sage-500/70 font-sans"> / {phase.pills}</span>
          </p>
          <p className="text-[11px] text-sage-600/70 mt-0.5">
            {allTaken ? 'Tutte prese ✓' : `${phase.pills - taken} da prendere`}
          </p>
        </div>
        <button
          onClick={() => !allTaken && updateCount(taken + 1)}
          disabled={allTaken || saving}
          className="w-9 h-9 rounded-full bg-gradient-to-br from-sage-500 to-sage-700 text-white text-lg font-bold disabled:opacity-30 transition-all flex items-center justify-center shadow-sage active:scale-95"
          aria-label="Aggiungi capsula"
        >+</button>
      </div>
    </>
  );

  if (embedded) return <div>{content}</div>;
  return (
    <div className="mb-6 border border-sage-100/80 rounded-xl-soft px-4 py-4 bg-white shadow-soft">
      {content}
    </div>
  );
}

function StatCard({ label, value, unit }) {
  return (
    <div className="bg-sage-50/60 rounded-xl px-3 py-3">
      <p className="text-[10px] uppercase tracking-wider text-sage-600/70 font-semibold mb-1">{label}</p>
      <p className="font-display text-xl font-semibold text-sage-900 tabular-nums leading-tight">
        {value}
        {unit && <span className="text-[11px] font-normal text-sage-500 ml-1 font-sans">{unit}</span>}
      </p>
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

function ProgressRing({ value, max, size = 220, stroke = 14, children }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const ratio = max > 0 ? Math.min(value / max, 1) : 0;
  const offset = circumference * (1 - ratio);
  const gradientId = 'ringGrad';
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90 absolute inset-0">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#85a081" />
            <stop offset="100%" stopColor="#41553e" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(104,131,97,0.12)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 900ms cubic-bezier(0.16, 1, 0.3, 1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
        {children}
      </div>
    </div>
  );
}

function PastAttempts({ attempts, bestDays }) {
  if (!attempts?.length) return null;
  return (
    <div>
      <h2 className="text-[11px] font-semibold text-sage-600/70 uppercase tracking-[0.18em] mb-3">
        Tentativi precedenti
      </h2>
      <div className="space-y-2">
        {attempts.map((a, i) => (
          <div key={i} className="flex items-center justify-between px-4 py-3 bg-cream-100/70 border border-sage-100/50 rounded-xl-soft">
            <div className="min-w-0">
              <p className="text-sm text-sage-900 font-medium">
                {new Date(a.startDate).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
              <p className="text-xs text-sage-600/70 mt-0.5">
                {a.endDate
                  ? `terminato il ${new Date(a.endDate).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}`
                  : 'in corso'}
              </p>
            </div>
            <p className="font-display text-base font-semibold text-sage-800 tabular-nums">
              {a.days !== null ? `${a.days}g` : '—'}
              {a.days === bestDays && bestDays > 0 && (
                <span className="ml-1 text-xs text-terracotta-500">★</span>
              )}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
