import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function PremiumSuccess() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;

    async function refresh() {
      try {
        const { user: fresh } = await api.auth.me();
        if (cancelled) return;
        updateUser(fresh);
        if (!fresh.isPremium && attempts < 6) {
          attempts++;
          setTimeout(refresh, 1500);
        }
      } catch {
        // riprova
      }
    }
    refresh();

    return () => { cancelled = true; };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen max-w-mobile mx-auto bg-white px-6 py-10 animate-fade-in">
      <div className="w-20 h-20 rounded-full bg-sage-100 flex items-center justify-center mb-6">
        <svg className="w-10 h-10 text-sage-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
        QuitFresh è sbloccato
      </h1>
      <p className="text-sm text-gray-500 text-center mb-8 max-w-xs">
        Tracker, promemoria, diario e chat AI sono ora tutti disponibili.
        Buon percorso.
      </p>

      {user && !user.isPremium && (
        <p className="text-xs text-gray-400 text-center mb-4">
          Stiamo confermando il pagamento…
        </p>
      )}

      <button
        onClick={() => navigate('/home')}
        disabled={user && !user.isPremium}
        className="w-full py-3.5 bg-sage-500 text-white rounded-2xl font-semibold text-base hover:bg-sage-600 disabled:opacity-60 transition-colors max-w-xs"
      >
        Inizia
      </button>
    </div>
  );
}
