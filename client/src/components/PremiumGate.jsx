import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { track } from '../lib/tracker';

const BASE_PRICE = 4.99;

export default function PremiumGate({ onCancel }) {
  const navigate = useNavigate();
  const { updateUser } = useAuth();
  const [promoCode, setPromoCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { track('paywall_seen'); }, []);

  async function handleCheckout() {
    track('paywall_cta_clicked', { hasPromo: Boolean(promoCode) });
    if (promoCode) track('promo_code_entered');
    setLoading(true);
    setError('');
    try {
      const result = await api.payments.checkout(promoCode || null);
      track('checkout_started', { freeActivated: Boolean(result.freeActivated) });
      if (result.freeActivated) {
        // Codice 100% riscattato lato server: refresh utente e vai al success.
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
    <div className="flex flex-col items-center justify-center px-6 py-10 max-w-mobile mx-auto">
      <div className="w-16 h-16 rounded-full bg-sage-100 flex items-center justify-center mb-5">
        <svg className="w-8 h-8 text-sage-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </div>

      <h2 className="text-xl font-bold text-gray-900 text-center mb-2">
        Sblocca QuitFresh
      </h2>
      <p className="text-sm text-gray-500 text-center mb-6">
        Un unico pagamento di €{BASE_PRICE.toFixed(2)} per accedere a tutto il
        percorso. Nessun abbonamento, nessun rinnovo.
      </p>

      <div className="w-full bg-sage-50 border border-sage-200 rounded-2xl px-5 py-4 mb-5">
        <p className="text-[11px] uppercase tracking-wider text-sage-600/70 font-semibold mb-2">Cosa sblocchi</p>
        <ul className="space-y-2 text-sm text-sage-800">
          <li className="flex items-start gap-2">
            <span className="text-sage-500 mt-0.5">✓</span>
            <span>Chat AI <strong>illimitata</strong> (gratis sono 10 messaggi a settimana)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-sage-500 mt-0.5">✓</span>
            <span>Promemoria citisina <strong>per tutti i 25 giorni</strong> (gratis solo i primi 3)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-sage-500 mt-0.5">✓</span>
            <span>Diario <strong>senza limiti</strong> (gratis 7 giorni)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-sage-500 mt-0.5">✓</span>
            <span>Statistiche avanzate: trend, analisi trigger, breakdown orario</span>
          </li>
        </ul>
        <p className="text-[11px] text-sage-700/70 mt-3 leading-snug">
          Tracker giorni, sigarette evitate, risparmio e SOS Craving restano sempre gratuiti.
        </p>
      </div>

      <div className="w-full mb-3">
        <label className="block text-xs font-medium text-gray-600 mb-1.5">
          Hai un codice promozionale?
        </label>
        <input
          type="text"
          value={promoCode}
          onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
          placeholder="Es. DOTTORESSA"
          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm uppercase tracking-wide focus:outline-none focus:ring-2 focus:ring-sage-400 transition"
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-3 w-full text-center">
          {error}
        </p>
      )}

      <button
        onClick={handleCheckout}
        disabled={loading}
        className="w-full py-3.5 bg-sage-500 text-white rounded-2xl font-semibold text-base hover:bg-sage-600 disabled:opacity-60 transition-colors"
      >
        {loading ? 'Attendi…' : `Sblocca · €${BASE_PRICE.toFixed(2)}`}
      </button>

      {onCancel && (
        <button
          onClick={onCancel}
          className="mt-3 text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
          Non ora
        </button>
      )}

      <p className="text-xs text-gray-400 text-center mt-4">
        Pagamento sicuro tramite Stripe. Nessun rinnovo automatico.
      </p>
    </div>
  );
}
