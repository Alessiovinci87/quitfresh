import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

const BADGE_EMOJI = {
  day1: '🌱',
  day3: '🌿',
  week1: '⭐',
  day14: '🌟',
  month1: '🏅',
  month3: '🏆',
};

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.progress.get()
      .then(setProgress)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (!user.quitDate) {
    navigate('/onboarding', { replace: true });
    return null;
  }

  const earnedBadges = progress?.badges?.filter((b) => b.earned) || [];
  const nextBadge = progress?.badges?.find((b) => !b.earned);

  return (
    <div className="px-6 py-8 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <p className="text-sm text-gray-500">Ciao,</p>
        <h1 className="text-xl font-bold text-gray-900 truncate">{user.email.split('@')[0]}</h1>
      </div>

      {/* Days counter — hero element */}
      <div className="text-center mb-8 py-10 bg-sage-50 rounded-2xl">
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
              dal {progress?.quitDate ? new Date(progress.quitDate).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
            </p>
          </>
        )}
      </div>

      {/* Stats row */}
      {!loading && progress && (
        <div className="grid grid-cols-2 gap-3 mb-8">
          <StatCard
            label="Sigarette evitate"
            value={progress.cigarettesAvoided}
            unit="sigarette"
          />
          <StatCard
            label="Risparmio stimato"
            value={`€${progress.moneySaved.toFixed(2)}`}
            unit=""
          />
        </div>
      )}

      {/* CTA button — always prominent */}
      <button
        onClick={() => navigate('/craving')}
        className="w-full py-5 bg-sage-500 text-white rounded-2xl font-bold text-lg shadow-lg shadow-sage-200 hover:bg-sage-600 active:bg-sage-700 active:scale-[0.98] transition-all mb-8"
      >
        Ho bisogno ORA
      </button>

      {/* Badges */}
      {!loading && (
        <div>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Traguardi
          </h2>
          <div className="space-y-2">
            {progress?.badges?.map((badge) => (
              <div
                key={badge.id}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  badge.earned
                    ? 'bg-sage-50 border border-sage-200'
                    : 'bg-gray-50 border border-gray-100 opacity-50'
                }`}
              >
                <span className="text-xl">{BADGE_EMOJI[badge.id] || '🎯'}</span>
                <div>
                  <p className={`text-sm font-medium ${badge.earned ? 'text-sage-800' : 'text-gray-500'}`}>
                    {badge.label}
                  </p>
                  {!badge.earned && nextBadge?.id === badge.id && (
                    <p className="text-xs text-gray-400">
                      Mancano {badge.days - (progress?.daysSinceQuit ?? 0)} giorni
                    </p>
                  )}
                </div>
                {badge.earned && (
                  <span className="ml-auto text-xs text-sage-600 font-medium">Raggiunto</span>
                )}
              </div>
            ))}
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
