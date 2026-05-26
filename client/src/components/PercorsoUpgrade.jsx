import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

// PercorsoUpgrade — schermata di upgrade del percorso (paywall tra G7 e G8).
// Minimale, tono osservativo: nessuna lista di feature, nessun "sblocca tutto".
// Riusa il flusso checkout di FeatureLimitPaywall (api.payments.checkout +
// gestione promo 100%). `className` permette di adattarla (card in Home,
// blocco centrato in Percorso).
export default function PercorsoUpgrade({ className = '' }) {
  const navigate = useNavigate();
  const { updateUser } = useAuth();
  const [promoCode, setPromoCode] = useState('');
  const [showPromo, setShowPromo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleCheckout() {
    setLoading(true);
    setError('');
    try {
      const result = await api.payments.checkout(promoCode || null);
      if (result.freeActivated) {
        const { user } = await api.auth.me();
        updateUser(user);
        navigate('/premium-success', { replace: true });
        return;
      }
      if (result.url) {
        window.location.href = result.url;
      } else {
        setError('Risposta inattesa dal server');
        setLoading(false);
      }
    } catch (err) {
      setError(err.message || 'Impossibile avviare il pagamento');
      setLoading(false);
    }
  }

  return (
    <div className={`bg-white border border-sage-100/70 rounded-2xl-soft shadow-soft px-6 py-7 ${className}`}>
      <h2 className="font-display text-[26px] leading-tight text-sage-900">Il percorso continua.</h2>
      <p className="text-sage-700/75 text-sm mt-3 leading-relaxed">
        Hai visto come funziona il meccanismo. I prossimi 21 giorni vanno più in profondità.
      </p>

      {error && (
        <p className="text-sm text-terracotta-700 bg-terracotta-100 border border-terracotta-200 rounded-xl-soft px-3 py-2 mt-4">
          {error}
        </p>
      )}

      <button
        onClick={handleCheckout}
        disabled={loading}
        className="mt-6 w-full py-3.5 bg-gradient-to-br from-sage-500 to-sage-700 text-white rounded-xl-soft font-semibold text-sm shadow-sage disabled:opacity-60 active:scale-[0.98] transition-all"
      >
        {loading ? 'Attendi…' : 'Continua per 4,99€'}
      </button>

      {showPromo && (
        <input
          type="text"
          value={promoCode}
          onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
          placeholder="Codice promo"
          className="w-full px-4 py-2.5 mt-3 border border-sage-200 rounded-xl-soft text-sm uppercase tracking-wide focus:outline-none focus:ring-2 focus:ring-sage-400"
        />
      )}

      <div className="mt-3 flex items-center justify-between">
        <button
          onClick={() => setShowPromo((v) => !v)}
          className="text-xs text-sage-500/70 hover:text-sage-700"
        >
          {showPromo ? 'Nascondi codice' : 'Ho un codice'}
        </button>
        <span className="text-xs text-sage-400">Una tantum · no rinnovo</span>
      </div>
    </div>
  );
}
