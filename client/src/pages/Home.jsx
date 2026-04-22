import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

const BADGE_EMOJI = {
  day1: '🌱', day3: '🌿', week1: '⭐', day14: '🌟', month1: '🏅', month3: '🏆',
};

export default function Home() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showRelapseConfirm, setShowRelapseConfirm] = useState(false);
  const [relapseLoading, setRelapseLoading] = useState(false);
  const [restartLoading, setRestartLoading] = useState(false);

  useEffect(() => {
    if (!user.quitDate) { setLoading(false); return; }
    api.progress.get()
      .then(setProgress)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user.quitDate]);

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
        <div className="mb-8">
          <p className="text-sm text-gray-500">Ciao,</p>
          <h1 className="text-xl font-bold text-gray-900 truncate">{user.email.split('@')[0]}</h1>
        </div>

        <div className="text-center py-12 bg-gray-50 rounded-2xl mb-6">
          <p className="text-4xl mb-3">🌱</p>
          <p className="text-lg font-semibold text-gray-800 mb-1">Quando vuoi ripartire, sei qui.</p>
          <p className="text-sm text-gray-500 mb-6">Ogni tentativo conta. Nessun giudizio.</p>
          <button
            onClick={handleRestart}
            disabled={restartLoading}
            className="px-6 py-3 bg-sage-500 text-white rounded-xl font-semibold text-sm hover:bg-sage-600 disabled:opacity-60 transition-colors"
          >
            {restartLoading ? 'Avvio…' : 'Riparto adesso'}
          </button>
        </div>

        {progress?.pastAttempts?.length > 0 && (
          <PastAttempts attempts={progress.pastAttempts} bestDays={progress.bestDays} />
        )}

        <button
          onClick={() => navigate('/craving')}
          className="w-full py-4 bg-sage-500 text-white rounded-2xl font-bold text-base shadow-lg shadow-sage-200 hover:bg-sage-600 transition-all"
        >
          Ho bisogno ORA
        </button>
      </div>
    );
  }

  return (
    <div className="px-6 py-8 animate-fade-in">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">Ciao,</p>
          <h1 className="text-xl font-bold text-gray-900 truncate">{user.email.split('@')[0]}</h1>
        </div>
      </div>

      {/* Days counter */}
      <div className="text-center mb-8 py-10 bg-sage-50 rounded-2xl relative">
        {loading ? (
          <div className="w-8 h-8 border-2 border-sage-400 border-t-transparent rounded-full animate-spin mx-auto" />
        ) : (
          <>
            <p className="text-8xl font-bold text-sage-600 tabular-nums leading-none">
              {progress?.daysSinceQuit ?? 0}
            </p>
            <p className="mt-3 text-sm font-medium text-sage-700">
              {(progress?.daysSinceQuit ?? 0) === 1 ? 'giorno senza fumo' : 'giorni senza fumo'}
            </p>
            <p className="mt-1 text-xs text-sage-500">
              dal {progress?.quitDate
                ? new Date(progress.quitDate).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
                : '—'}
            </p>
            {progress?.bestDays > 0 && (
              <p className="mt-2 text-xs text-sage-400">
                Record precedente: {progress.bestDays} {progress.bestDays === 1 ? 'giorno' : 'giorni'}
              </p>
            )}
          </>
        )}
      </div>

      {/* Stats */}
      {!loading && progress && (
        <div className="grid grid-cols-2 gap-3 mb-8">
          <StatCard label="Sigarette evitate" value={progress.cigarettesAvoided} unit="sigarette" />
          <StatCard label="Risparmio stimato" value={`€${progress.moneySaved.toFixed(2)}`} unit="" />
        </div>
      )}

      {/* CTA */}
      <button
        onClick={() => navigate('/craving')}
        className="w-full py-5 bg-sage-500 text-white rounded-2xl font-bold text-lg shadow-lg shadow-sage-200 hover:bg-sage-600 active:bg-sage-700 active:scale-[0.98] transition-all mb-4"
      >
        Ho bisogno ORA
      </button>

      {/* Relapse button — discreto */}
      <button
        onClick={() => setShowRelapseConfirm(true)}
        className="w-full py-2 text-xs text-gray-400 hover:text-gray-600 transition-colors mb-6"
      >
        Ho ceduto — vuoi azzerare il contatore?
      </button>

      {/* Badges */}
      {!loading && progress?.badges && (
        <div>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Traguardi</h2>
          <div className="space-y-2">
            {progress.badges.map((badge) => (
              <div
                key={badge.id}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  badge.earned ? 'bg-sage-50 border border-sage-200' : 'bg-gray-50 border border-gray-100 opacity-50'
                }`}
              >
                <span className="text-xl">{BADGE_EMOJI[badge.id] || '🎯'}</span>
                <div>
                  <p className={`text-sm font-medium ${badge.earned ? 'text-sage-800' : 'text-gray-500'}`}>
                    {badge.label}
                  </p>
                  {!badge.earned && progress.daysSinceQuit < badge.days && (
                    <p className="text-xs text-gray-400">
                      Mancano {badge.days - progress.daysSinceQuit} giorni
                    </p>
                  )}
                </div>
                {badge.earned && <span className="ml-auto text-xs text-sage-600 font-medium">Raggiunto</span>}
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
        <div className="fixed inset-0 bg-black/40 flex items-end justify-center z-50 px-4 pb-8">
          <div className="bg-white rounded-2xl p-6 w-full max-w-mobile animate-slide-up">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Azzerare il contatore?</h3>
            <p className="text-sm text-gray-500 mb-6">
              I giorni precedenti vengono salvati nella cronologia. Puoi ripartire quando sei pronto.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowRelapseConfirm(false)}
                className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-xl font-medium text-sm hover:bg-gray-50 transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={handleRelapse}
                disabled={relapseLoading}
                className="flex-1 py-3 bg-red-500 text-white rounded-xl font-semibold text-sm hover:bg-red-600 disabled:opacity-60 transition-colors"
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

function StatCard({ label, value, unit }) {
  return (
    <div className="bg-gray-50 rounded-xl px-4 py-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-xl font-bold text-gray-900">
        {value}
        {unit && <span className="text-xs font-normal text-gray-500 ml-1">{unit}</span>}
      </p>
    </div>
  );
}

function PastAttempts({ attempts, bestDays }) {
  if (!attempts?.length) return null;
  return (
    <div>
      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
        Tentativi precedenti
      </h2>
      <div className="space-y-2">
        {attempts.map((a, i) => (
          <div key={i} className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-xl">
            <div>
              <p className="text-sm text-gray-700">
                {new Date(a.startDate).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
              <p className="text-xs text-gray-400">
                {a.endDate
                  ? `terminato il ${new Date(a.endDate).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}`
                  : 'in corso'}
              </p>
            </div>
            <p className="text-sm font-bold text-gray-600">
              {a.days !== null ? `${a.days}g` : '—'}
              {a.days === bestDays && bestDays > 0 && (
                <span className="ml-1 text-xs text-sage-600">★</span>
              )}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
