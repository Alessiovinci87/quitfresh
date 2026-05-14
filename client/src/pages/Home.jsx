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
    <div className="mb-3 bg-cream-100 border border-terracotta-200 rounded-xl px-3 py-2 flex items-start gap-2">
      <span className="text-terracotta-500 text-sm mt-0.5">⚠</span>
      <div className="flex-1 text-xs text-sage-900">
        <p className="font-medium">Verifica la tua email.</p>
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
      <div className="min-h-[calc(100dvh-7rem)] flex flex-col px-6 pt-6 animate-fade-in">
        {verifyBanner}
        <header className="mb-4">
          <p className="text-[10px] uppercase tracking-[0.2em] text-sage-600/70 font-semibold">Oggi</p>
          <h1 className="font-display text-3xl font-semibold text-sage-900 truncate leading-tight mt-0.5">
            {user.email.split('@')[0]}
          </h1>
        </header>

        <div className="flex-1 flex items-center justify-center">
          <div className="relative text-center py-14 px-6 rounded-2xl-soft overflow-hidden bg-gradient-to-br from-sage-50 via-cream-50 to-sage-100 shadow-card w-full">
            <div className="absolute inset-0 pointer-events-none opacity-60 bg-[radial-gradient(circle_at_50%_30%,rgba(104,131,97,0.15),transparent_60%)]" />
            <div className="relative">
              <p className="text-5xl mb-3">🌱</p>
              <p className="font-display text-xl font-semibold text-sage-900 mb-1">Quando vuoi, sei qui.</p>
              <p className="text-sm text-sage-700/80 mb-6">Ogni tentativo conta. Nessun giudizio.</p>
              <button
                onClick={handleRestart}
                disabled={restartLoading}
                className="px-6 py-3 bg-gradient-to-br from-sage-500 to-sage-700 text-white rounded-xl-soft font-semibold text-sm shadow-sage disabled:opacity-60 transition-all active:scale-[0.98]"
              >
                {restartLoading ? 'Avvio…' : 'Riparto adesso'}
              </button>
            </div>
          </div>
        </div>

        <button
          onClick={() => navigate('/craving')}
          className="w-full py-4 mb-3 bg-gradient-to-br from-sage-500 to-sage-700 text-white rounded-2xl-soft font-semibold text-base shadow-sage active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Ho bisogno ORA
        </button>
      </div>
    );
  }

  // ── Stato principale ──────────────────────────────────────
  const days = progress?.daysSinceQuit ?? 0;
  const nextBadge = progress?.badges?.find((b) => !b.earned);
  const ringTarget = nextBadge?.days ?? Math.max(days + 1, 30);

  return (
    <div className="min-h-[calc(100dvh-7rem)] flex flex-col px-6 pt-6 animate-fade-in">
      {verifyBanner}

      {/* Header compatto */}
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.2em] text-sage-600/70 font-semibold">Oggi</p>
          <h1 className="font-display text-2xl font-semibold text-sage-900 truncate leading-tight mt-0.5">
            {user.email.split('@')[0]}
          </h1>
        </div>
        {progress?.freezesAvailable > 0 && (
          <button
            onClick={() => setShowStreakSheet(true)}
            className="shrink-0 inline-flex items-center gap-1.5 text-xs font-medium text-sage-800 bg-white border border-sage-200 px-3 py-1.5 rounded-full shadow-soft active:scale-95 transition-all"
            aria-label={`${progress.freezesAvailable} freeze disponibili`}
          >
            <span>❄</span>
            <span className="tabular-nums">{progress.freezesAvailable}</span>
          </button>
        )}
      </header>

      {/* Ring centrale — tappable */}
      <button
        onClick={() => setShowStreakSheet(true)}
        className="flex-1 flex flex-col items-center justify-center py-2 group focus:outline-none"
        aria-label="Apri dettagli streak"
      >
        {loading ? (
          <div className="w-8 h-8 border-2 border-sage-400 border-t-transparent rounded-full animate-spin" />
        ) : (
          <>
            <ProgressRing value={days} max={ringTarget} size={240} stroke={14}>
              <p className="font-display text-[80px] font-semibold text-sage-800 tabular-nums leading-none tracking-tight transition-transform group-active:scale-[0.97]">
                {days}
              </p>
              <p className="text-[11px] font-semibold text-sage-600/80 tracking-wider mt-1 uppercase">
                {days === 1 ? 'giorno' : 'giorni'}
              </p>
              {nextBadge ? (
                <p className="text-[10px] text-sage-600/60 mt-2">
                  {ringTarget - days} al traguardo
                </p>
              ) : (
                <p className="text-[10px] text-sage-700 mt-2 font-medium">Tutti i traguardi ✓</p>
              )}
            </ProgressRing>

            <p className="mt-3 text-[11px] text-sage-700/70 inline-flex items-center gap-2">
              <span>
                dal {progress?.quitDate
                  ? new Date(progress.quitDate).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })
                  : '—'}
              </span>
              {progress?.bestDays > 0 && (
                <>
                  <span className="text-sage-300">·</span>
                  <span className="inline-flex items-center gap-1">
                    <span className="text-terracotta-500">★</span>
                    Record {progress.bestDays}
                  </span>
                </>
              )}
              <span className="text-sage-300">·</span>
              <span className="text-sage-600/60 underline underline-offset-2">dettagli</span>
            </p>
          </>
        )}
      </button>

      {/* Capsule oggi — compatta */}
      <CapsuleCompact user={user} />

      {/* CTA */}
      <button
        onClick={() => navigate('/craving')}
        className="w-full py-4 mt-3 bg-gradient-to-br from-sage-500 to-sage-700 text-white rounded-2xl-soft font-semibold text-base shadow-sage active:scale-[0.98] transition-all flex items-center justify-center gap-2"
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
    </div>
  );
}

// ── CapsuleCompact: card piccola con dots + bottoni +/- ──────
function CapsuleCompact({ user }) {
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

  return (
    <div className="bg-white border border-sage-100/80 rounded-2xl-soft px-4 py-3 shadow-soft mt-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-6 h-6 rounded-md bg-sage-50 flex items-center justify-center text-xs">💊</span>
          <p className="text-[11px] uppercase tracking-wider text-sage-600/70 font-semibold">Capsule oggi</p>
        </div>
        <span className="text-[10px] font-medium text-sage-700 bg-sage-50 px-2 py-0.5 rounded-full shrink-0">
          Fase {phase.index + 1}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => taken > 0 && updateCount(taken - 1)}
          disabled={taken <= 0 || saving}
          className="w-9 h-9 rounded-full border border-sage-200/70 text-sage-700 text-lg font-bold disabled:opacity-30 hover:bg-sage-50 transition-all flex items-center justify-center active:scale-95 shrink-0"
          aria-label="Togli capsula"
        >−</button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            {Array.from({ length: phase.pills }).map((_, i) => (
              <div
                key={i}
                className={`flex-1 h-1.5 rounded-full transition-all ${
                  i < taken ? 'bg-gradient-to-r from-sage-500 to-sage-700' : 'bg-sage-100'
                }`}
              />
            ))}
          </div>
          <p className="text-[11px] text-sage-700/80">
            <span className="font-display text-sm font-semibold text-sage-900 tabular-nums">{taken}</span>
            <span className="text-sage-500/70"> / {phase.pills}</span>
            {' · '}
            {allTaken ? 'tutte prese ✓' : `${phase.pills - taken} da prendere`}
          </p>
        </div>

        <button
          onClick={() => !allTaken && updateCount(taken + 1)}
          disabled={allTaken || saving}
          className="w-9 h-9 rounded-full bg-gradient-to-br from-sage-500 to-sage-700 text-white text-lg font-bold disabled:opacity-30 transition-all flex items-center justify-center shadow-sage active:scale-95 shrink-0"
          aria-label="Aggiungi capsula"
        >+</button>
      </div>
    </div>
  );
}

// ── StreakSheet: bottom-sheet con aggiusta giorni + badges + storia ──
function StreakSheet({ progress, days, adjusting, onAdjust, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center animate-fade-in">
      <div
        className="absolute inset-0 bg-sage-900/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-mobile bg-white rounded-t-3xl shadow-lift animate-slide-up max-h-[85dvh] overflow-y-auto">
        <div className="sticky top-0 bg-white/95 backdrop-blur-md pt-3 pb-2 px-6 z-10">
          <div className="w-10 h-1 bg-sage-200 rounded-full mx-auto mb-3" />
          <div className="flex items-center justify-between">
            <h3 className="font-display text-xl font-semibold text-sage-900">Streak</h3>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-sage-50 text-sage-700 flex items-center justify-center"
              aria-label="Chiudi"
            >✕</button>
          </div>
        </div>

        <div className="px-6 pb-6 space-y-5">
          {/* Aggiusta giorni */}
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-sage-600/70 font-semibold mb-2">
              Aggiusta giorni
            </p>
            <div className="bg-cream-100/60 border border-sage-100 rounded-xl-soft p-4 flex items-center justify-between">
              <button
                onClick={() => onAdjust(-1)}
                disabled={adjusting || days <= 0}
                className="w-10 h-10 rounded-full bg-white border border-sage-200 text-sage-700 text-xl font-bold disabled:opacity-30 hover:bg-sage-50 transition-all flex items-center justify-center shadow-soft active:scale-95"
                aria-label="Diminuisci giorni"
              >−</button>
              <div className="text-center">
                <p className="font-display text-3xl font-semibold text-sage-900 tabular-nums leading-none">{days}</p>
                <p className="text-[10px] text-sage-600/70 mt-1 uppercase tracking-wider">
                  {days === 1 ? 'giorno' : 'giorni'}
                </p>
              </div>
              <button
                onClick={() => onAdjust(+1)}
                disabled={adjusting}
                className="w-10 h-10 rounded-full bg-gradient-to-br from-sage-500 to-sage-700 text-white text-xl font-bold disabled:opacity-30 transition-all flex items-center justify-center shadow-sage active:scale-95"
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
              <p className="text-[10px] uppercase tracking-[0.18em] text-sage-600/70 font-semibold mb-2">
                Traguardi
              </p>
              <div className="bg-white rounded-xl-soft border border-sage-100 overflow-hidden divide-y divide-sage-100/60">
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
                      <span className="text-[10px] text-sage-700 font-medium bg-sage-50 px-2 py-0.5 rounded-full shrink-0">
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
            <div className="bg-cream-100/60 border border-sage-100 rounded-xl-soft p-3 flex items-center gap-3">
              <span className="w-9 h-9 rounded-full bg-sage-50 flex items-center justify-center text-lg">❄</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sage-900">
                  {progress.freezesAvailable || 0} freeze disponibili
                </p>
                <p className="text-[11px] text-sage-600/70">
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
              <p className="text-[10px] uppercase tracking-[0.18em] text-sage-600/70 font-semibold mb-2">
                Tentativi precedenti
              </p>
              <div className="space-y-2">
                {progress.pastAttempts.map((a, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-3 bg-cream-100/70 border border-sage-100/50 rounded-xl-soft">
                    <div className="min-w-0">
                      <p className="text-sm text-sage-900 font-medium">
                        {new Date(a.startDate).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                      <p className="text-[11px] text-sage-600/70 mt-0.5">
                        {a.endDate
                          ? `terminato il ${new Date(a.endDate).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}`
                          : 'in corso'}
                      </p>
                    </div>
                    <p className="font-display text-base font-semibold text-sage-800 tabular-nums">
                      {a.days !== null ? `${a.days}g` : '—'}
                      {a.days === progress.bestDays && progress.bestDays > 0 && (
                        <span className="ml-1 text-xs text-terracotta-500">★</span>
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
              onClick={onUseFreeze}
              disabled={relapseLoading}
              className="w-full py-3.5 bg-gradient-to-br from-sage-500 to-sage-700 text-white rounded-xl-soft font-semibold text-sm shadow-sage disabled:opacity-60 active:scale-[0.98] transition-all mb-2 flex items-center justify-center gap-2"
            >
              <span>❄</span>
              {relapseLoading ? 'Uso freeze…' : 'Usa un freeze'}
            </button>
            <button
              onClick={onRelapse}
              disabled={relapseLoading}
              className="w-full py-3 border border-terracotta-200 text-terracotta-700 rounded-xl-soft font-medium text-sm hover:bg-terracotta-50 disabled:opacity-60 transition-colors active:scale-[0.98] mb-2"
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
            <h3 className="font-display text-xl font-semibold text-sage-900 mb-2">Azzerare il contatore?</h3>
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
                className="flex-1 py-3 border border-sage-200 text-sage-700 rounded-xl-soft font-medium text-sm hover:bg-sage-50 transition-colors active:scale-[0.98]"
              >
                Annulla
              </button>
              <button
                onClick={onRelapse}
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
  );
}

// ── ProgressRing: SVG con gradient sage ────────────────────────
function ProgressRing({ value, max, size = 220, stroke = 14, children }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const ratio = max > 0 ? Math.min(value / max, 1) : 0;
  const offset = circumference * (1 - ratio);
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90 absolute inset-0">
        <defs>
          <linearGradient id="homeRingGrad" x1="0" y1="0" x2="1" y2="1">
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
          stroke="url(#homeRingGrad)"
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
