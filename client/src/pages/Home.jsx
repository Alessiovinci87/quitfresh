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

  return (
    <div className="px-6 py-8 animate-fade-in">
      <InstallApp mode="card" />
      {verifyBanner}
      <div className="mb-8 flex items-end justify-between">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.18em] text-sage-600/70 font-medium">Bentornato</p>
          <h1 className="font-display text-3xl font-semibold text-sage-900 truncate leading-tight mt-1">
            {user.email.split('@')[0]}
          </h1>
        </div>
      </div>

      {/* Days counter — hero editoriale */}
      <div className="relative text-center mb-8 py-12 px-6 rounded-2xl-soft overflow-hidden bg-gradient-to-br from-sage-50 via-cream-50 to-sage-100 shadow-card">
        <div className="absolute inset-0 pointer-events-none opacity-60 bg-[radial-gradient(circle_at_50%_30%,rgba(104,131,97,0.18),transparent_60%)]" />
        {loading ? (
          <div className="w-8 h-8 border-2 border-sage-400 border-t-transparent rounded-full animate-spin mx-auto relative" />
        ) : (
          <div className="relative">
            <div className="flex items-center justify-center gap-5">
              <button
                onClick={() => adjustDays(-1)}
                disabled={adjusting || (progress?.daysSinceQuit ?? 0) <= 0}
                className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm border border-sage-200/60 text-sage-700 text-xl font-bold disabled:opacity-30 hover:bg-white transition-all flex items-center justify-center shadow-soft active:scale-95"
                aria-label="Diminuisci giorni"
              >−</button>
              <p className="font-display text-[88px] font-semibold text-sage-700 tabular-nums leading-none tracking-tight">
                {progress?.daysSinceQuit ?? 0}
              </p>
              <button
                onClick={() => adjustDays(+1)}
                disabled={adjusting}
                className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm border border-sage-200/60 text-sage-700 text-xl font-bold disabled:opacity-30 hover:bg-white transition-all flex items-center justify-center shadow-soft active:scale-95"
                aria-label="Aumenta giorni"
              >+</button>
            </div>
            <p className="mt-4 text-sm font-medium text-sage-700 tracking-wide">
              {(progress?.daysSinceQuit ?? 0) === 1 ? 'giorno senza fumo' : 'giorni senza fumo'}
            </p>
            <p className="mt-1 text-xs text-sage-600/70">
              dal {progress?.quitDate
                ? new Date(progress.quitDate).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
                : '—'}
            </p>
            {progress?.bestDays > 0 && (
              <p className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-sage-700 bg-white/70 px-2.5 py-1 rounded-full backdrop-blur-sm">
                <span>★</span>
                Record precedente: {progress.bestDays} {progress.bestDays === 1 ? 'giorno' : 'giorni'}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Stats */}
      {!loading && progress && (
        <div className="grid grid-cols-2 gap-3 mb-8">
          <StatCard label="Sigarette evitate" value={progress.cigarettesAvoided} unit="sigarette" />
          <StatCard label="Risparmio stimato" value={`€${progress.moneySaved.toFixed(2)}`} unit="" />
        </div>
      )}

      {/* Capsule tracker */}
      <CapsuleTracker user={user} />

      {/* CTA */}
      <button
        onClick={() => navigate('/craving')}
        className="w-full py-5 bg-gradient-to-br from-sage-500 to-sage-700 text-white rounded-2xl-soft font-semibold text-lg tracking-wide shadow-sage hover:from-sage-600 hover:to-sage-700 active:scale-[0.98] transition-all mb-4"
      >
        Ho bisogno ORA
      </button>

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
          <h2 className="text-[11px] font-semibold text-sage-600/70 uppercase tracking-[0.18em] mb-3">Traguardi</h2>
          <div className="space-y-2">
            {progress.badges.map((badge) => (
              <div
                key={badge.id}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl-soft transition-all ${
                  badge.earned
                    ? 'bg-white border border-sage-100 shadow-soft'
                    : 'bg-cream-100/60 border border-sage-100/40 opacity-70'
                }`}
              >
                <span className="text-2xl">{BADGE_EMOJI[badge.id] || '🎯'}</span>
                <div className="min-w-0">
                  <p className={`text-sm font-medium ${badge.earned ? 'text-sage-900' : 'text-sage-700/60'}`}>
                    {badge.label}
                  </p>
                  {!badge.earned && progress.daysSinceQuit < badge.days && (
                    <p className="text-xs text-sage-600/60 mt-0.5">
                      Mancano {badge.days - progress.daysSinceQuit} giorni
                    </p>
                  )}
                </div>
                {badge.earned && (
                  <span className="ml-auto text-[11px] text-sage-700 font-medium bg-sage-50 px-2 py-0.5 rounded-full">
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

      {/* Relapse confirm modal */}
      {showRelapseConfirm && (
        <div className="fixed inset-0 bg-sage-900/40 backdrop-blur-sm flex items-end justify-center z-50 px-4 pb-8 animate-fade-in">
          <div className="bg-white rounded-2xl-soft p-6 w-full max-w-mobile animate-slide-up shadow-lift">
            <h3 className="font-display text-xl font-semibold text-sage-900 mb-2">Azzerare il contatore?</h3>
            <p className="text-sm text-sage-700/80 mb-6 leading-relaxed">
              I giorni precedenti vengono salvati nella cronologia. Puoi ripartire quando sei pronto.
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
          </div>
        </div>
      )}
    </div>
  );
}

function CapsuleTracker({ user }) {
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
    <div className="mb-6 border border-sage-100/80 rounded-xl-soft px-4 py-4 bg-white shadow-soft">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-sage-900">Capsule di oggi</h2>
        <span className="text-[11px] font-medium text-sage-700 bg-sage-50 px-2 py-0.5 rounded-full">
          Giorno {phase.day} · Fase {phase.index + 1}
        </span>
      </div>

      {/* Dosi visuali */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {doseTimes.map((t, i) => (
          <div key={t} className="flex flex-col items-center gap-1 min-w-[2.5rem]">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
              i < taken ? 'bg-sage-500 text-white' : 'bg-gray-100 text-gray-400'
            }`}>
              {i < taken ? '✓' : i + 1}
            </div>
            <span className="text-xs text-gray-400">{t}</span>
          </div>
        ))}
      </div>

      {/* Contatore +/− */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => taken > 0 && updateCount(taken - 1)}
          disabled={taken <= 0 || saving}
          className="w-10 h-10 rounded-full border border-sage-100 text-sage-700 text-xl font-bold disabled:opacity-30 hover:bg-sage-50 transition-all flex items-center justify-center active:scale-95"
          aria-label="Togli capsula"
        >−</button>
        <div className="flex-1 text-center">
          <p className="font-display text-2xl font-semibold text-sage-800 tabular-nums">
            {pillsTaken === null ? '…' : taken}
            <span className="text-sm font-normal text-sage-500/80 font-sans"> / {phase.pills}</span>
          </p>
          <p className="text-xs text-sage-600/70 mt-0.5">
            {allTaken ? 'Tutte le capsule prese ✓' : `ancora ${phase.pills - taken} da prendere`}
          </p>
        </div>
        <button
          onClick={() => !allTaken && updateCount(taken + 1)}
          disabled={allTaken || saving}
          className="w-10 h-10 rounded-full bg-sage-600 text-white text-xl font-bold disabled:opacity-30 hover:bg-sage-700 transition-all flex items-center justify-center shadow-sage active:scale-95"
          aria-label="Aggiungi capsula"
        >+</button>
      </div>
    </div>
  );
}

function StatCard({ label, value, unit }) {
  return (
    <div className="bg-white border border-sage-100/80 rounded-xl-soft px-4 py-4 shadow-soft">
      <p className="text-[11px] uppercase tracking-wider text-sage-600/70 font-medium mb-1.5">{label}</p>
      <p className="font-display text-2xl font-semibold text-sage-900 tabular-nums">
        {value}
        {unit && <span className="text-[11px] font-normal text-gray-500 ml-1 font-sans">{unit}</span>}
      </p>
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
