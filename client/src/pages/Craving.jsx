import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';

const STATE = {
  IDLE: 'idle',
  LOADING: 'loading',
  RESULT: 'result',
  DONE: 'done',
  ERROR: 'error',
};

export default function Craving() {
  const navigate = useNavigate();
  const [context, setContext] = useState('');
  const [state, setState] = useState(STATE.IDLE);
  const [response, setResponse] = useState(null);
  const [cravingId, setCravingId] = useState(null);
  const [error, setError] = useState('');

  async function handleRequest() {
    setState(STATE.LOADING);
    setError('');
    try {
      const data = await api.craving.create({ context });
      setCravingId(data.id);
      setResponse(data);
      setState(STATE.RESULT);
    } catch (err) {
      setError(err.message);
      setState(STATE.ERROR);
    }
  }

  async function handleResolved() {
    if (cravingId) {
      try {
        await api.craving.resolve(cravingId);
      } catch {
        // non critico
      }
    }
    setState(STATE.DONE);
  }

  if (state === STATE.DONE) {
    return (
      <div className="px-6 py-16 text-center animate-fade-in">
        <div className="text-5xl mb-4">✓</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Ce l'hai fatta.</h2>
        <p className="text-gray-500 text-sm mb-8">Ogni craving superato conta.</p>
        <button
          onClick={() => navigate('/home')}
          className="w-full py-3.5 bg-sage-500 text-white rounded-xl font-semibold text-sm hover:bg-sage-600 transition-colors"
        >
          Torna alla home
        </button>
      </div>
    );
  }

  return (
    <div className="px-6 py-8 animate-fade-in">
      <button
        onClick={() => navigate('/home')}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-8 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Indietro
      </button>

      {state === STATE.IDLE && (
        <div className="animate-slide-up">
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Cosa sta succedendo?</h2>
          <p className="text-gray-500 text-sm mb-6">Scrivi liberamente — craving, domanda, dubbio, pensiero. Più contesto dai, meglio rispondo.</p>
          <textarea
            value={context}
            onChange={(e) => setContext(e.target.value)}
            rows={5}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-sage-400 focus:border-transparent transition"
            placeholder="Es. sto iniziando la citisina e ho paura di non farcela… oppure sono al bar con amici e non so come gestirla…"
          />
          <button
            onClick={handleRequest}
            className="w-full mt-6 py-5 bg-sage-500 text-white rounded-2xl font-bold text-lg shadow-lg shadow-sage-200 hover:bg-sage-600 active:bg-sage-700 transition-all"
          >
            Ho bisogno ORA
          </button>
        </div>
      )}

      {state === STATE.LOADING && (
        <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
          <div className="w-10 h-10 border-2 border-sage-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-sm text-gray-500">Sto elaborando una risposta per te…</p>
        </div>
      )}

      {state === STATE.RESULT && response && (
        <div className="animate-slide-up space-y-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
            In questo momento
          </h2>

          <AICard
            icon="💬"
            label="Riconoscimento"
            content={response.recognition}
            accent
          />
          <AICard
            icon="⚡"
            label="Fai adesso"
            content={response.action}
          />
          <AICard
            icon="🕐"
            label="Prossimi 5 minuti"
            content={response.strategy}
          />

          <button
            onClick={handleResolved}
            className="w-full mt-4 py-4 bg-sage-500 text-white rounded-xl font-bold text-base hover:bg-sage-600 active:bg-sage-700 active:scale-[0.98] transition-all"
          >
            Ce l'ho fatta
          </button>

          <button
            onClick={() => navigate('/home')}
            className="w-full py-3 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Torna alla home senza segnare
          </button>
        </div>
      )}

      {state === STATE.ERROR && (
        <div className="animate-fade-in">
          <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-4 mb-6">
            <p className="text-sm text-red-700">{error}</p>
          </div>
          <button
            onClick={() => setState(STATE.IDLE)}
            className="w-full py-3.5 bg-gray-100 text-gray-700 rounded-xl font-medium text-sm hover:bg-gray-200 transition-colors"
          >
            Riprova
          </button>
        </div>
      )}
    </div>
  );
}

function AICard({ icon, label, content, accent }) {
  return (
    <div className={`rounded-xl px-4 py-4 ${accent ? 'bg-sage-50 border border-sage-200' : 'bg-gray-50 border border-gray-100'}`}>
      <div className="flex items-center gap-2 mb-1.5">
        <span>{icon}</span>
        <p className={`text-xs font-semibold uppercase tracking-wider ${accent ? 'text-sage-600' : 'text-gray-500'}`}>
          {label}
        </p>
      </div>
      <p className={`text-sm font-medium leading-relaxed ${accent ? 'text-sage-900' : 'text-gray-800'}`}>
        {content}
      </p>
    </div>
  );
}
