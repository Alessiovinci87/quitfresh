import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

const BASE_PRICE = 4.99;

// Copy contestuale per ciascuna feature. Importante: spieghiamo COSA
// si sblocca + ricordiamo che i dati gia' accumulati restano salvi.
const FEATURE_COPY = {
  chat: {
    icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
    title: 'Hai usato i tuoi 3 messaggi gratuiti',
    body: 'Continuare la chat ti permette di tornare nei momenti difficili senza limiti, con un coach che conosce i tuoi dati e i tuoi pattern.',
    unlocks: [
      'Chat AI illimitata, sempre',
      'I 3 messaggi già scambiati restano salvati',
      'Promemoria citisina completi (tutti i 25 giorni)',
      'Diario senza limite + statistiche avanzate',
    ],
  },
  diary: {
    icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    title: 'Diario: 7 giorni completati',
    body: 'Hai costruito una settimana di tracciamento. Sbloccando Premium continui senza limiti e mantieni tutto lo storico.',
    unlocks: [
      'Diario illimitato',
      'Le 7 entry attuali restano tutte',
      'Chat AI illimitata',
      'Analisi trigger personali e trend',
    ],
  },
  cytisine: {
    icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
    title: 'Promemoria citisina: hai provato i primi 3 giorni',
    body: 'Per i restanti 22 giorni del protocollo, sblocca i promemoria automatici a ogni dose così non ne salti nessuna.',
    unlocks: [
      'Promemoria a ogni capsula, tutti i giorni',
      'Notifiche personalizzate sul tuo orario',
      'Chat AI e diario illimitati',
    ],
  },
  stats: {
    icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
    title: 'Statistiche avanzate',
    body: 'I numeri base sono e restano gratis. Per vedere trend, pattern orari dei craving e analisi dei trigger sblocca Premium.',
    unlocks: [
      'Trend settimanali e mensili',
      'Breakdown orario dei craving',
      'Analisi trigger personali',
      'Fase citisina dettagliata',
    ],
  },
};

export default function FeatureLimitPaywall({ feature, compact = false }) {
  const copy = FEATURE_COPY[feature] || FEATURE_COPY.chat;
  const navigate = useNavigate();
  const { updateUser } = useAuth();
  const [promoCode, setPromoCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPromo, setShowPromo] = useState(false);

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
    <div className={`bg-white border border-sage-200 rounded-2xl p-5 ${compact ? '' : 'shadow-sm'}`}>
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-sage-100 flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-sage-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d={copy.icon} />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-gray-900 leading-tight">{copy.title}</h3>
          <p className="text-sm text-gray-600 mt-1">{copy.body}</p>
        </div>
      </div>

      <ul className="space-y-1.5 text-sm text-sage-800 bg-sage-50 rounded-xl px-4 py-3 mb-4">
        {copy.unlocks.map((u) => (
          <li key={u} className="flex items-start gap-2">
            <span className="text-sage-500 mt-0.5">✓</span>
            <span>{u}</span>
          </li>
        ))}
      </ul>

      {showPromo && (
        <input
          type="text"
          value={promoCode}
          onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
          placeholder="Codice promo"
          className="w-full px-4 py-2.5 mb-3 border border-gray-200 rounded-xl text-sm uppercase tracking-wide focus:outline-none focus:ring-2 focus:ring-sage-400"
        />
      )}

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-3 text-center">{error}</p>
      )}

      <button
        onClick={handleCheckout}
        disabled={loading}
        className="w-full py-3 bg-sage-500 text-white rounded-xl font-semibold text-base hover:bg-sage-600 disabled:opacity-60 transition-colors"
      >
        {loading ? 'Attendi…' : `Sblocca tutto · €${BASE_PRICE.toFixed(2)}`}
      </button>

      <div className="flex items-center justify-between mt-3">
        <button
          onClick={() => setShowPromo((v) => !v)}
          className="text-xs text-gray-500 hover:text-gray-700"
        >
          {showPromo ? 'Nascondi codice promo' : 'Ho un codice promo'}
        </button>
        <span className="text-xs text-gray-400">Una tantum · no rinnovo</span>
      </div>
    </div>
  );
}
