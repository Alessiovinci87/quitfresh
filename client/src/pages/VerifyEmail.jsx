import { useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  // 'idle' = utente non ha ancora cliccato, 'verifying' | 'success' | 'error'.
  // L'auto-fire al mount è stato rimosso perché scanner email (Outlook Safe
  // Links, Defender) eseguono il link in headless e consumavano il token
  // prima che l'utente reale ci cliccasse.
  const [state, setState] = useState(token ? 'idle' : 'missing');
  const [errorMsg, setErrorMsg] = useState('');
  const inFlight = useRef(false);

  async function handleVerify() {
    if (inFlight.current) return;
    inFlight.current = true;
    setState('verifying');
    try {
      await api.auth.verifyEmail(token);
      setState('success');
    } catch (err) {
      setState('error');
      setErrorMsg(err.message || 'Token non valido o già usato.');
    } finally {
      inFlight.current = false;
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-6 py-12">
      <div className="max-w-mobile w-full text-center">
        {state === 'idle' && (
          <>
            <div className="w-16 h-16 rounded-full bg-sage-100 flex items-center justify-center mx-auto mb-5">
              <svg className="w-8 h-8 text-sage-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Conferma la tua email</h1>
            <p className="text-sm text-gray-500 mb-6">
              Tocca il bottone qui sotto per completare la verifica.
            </p>
            <button
              onClick={handleVerify}
              className="inline-block px-6 py-3 bg-sage-500 text-white rounded-2xl font-semibold text-sm hover:bg-sage-600 transition-colors"
            >
              Verifica email
            </button>
          </>
        )}

        {state === 'verifying' && (
          <p className="text-sm text-gray-500">Verifica in corso…</p>
        )}

        {state === 'missing' && (
          <>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Link non valido</h1>
            <p className="text-sm text-red-600 mb-6">Token mancante nel link.</p>
            <Link to="/home" className="inline-block px-6 py-3 bg-sage-500 text-white rounded-2xl font-semibold text-sm hover:bg-sage-600">
              Torna all'app
            </Link>
          </>
        )}

        {state === 'success' && (
          <>
            <div className="w-16 h-16 rounded-full bg-sage-100 flex items-center justify-center mx-auto mb-5">
              <svg className="w-8 h-8 text-sage-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Email verificata</h1>
            <p className="text-sm text-gray-500 mb-6">Grazie. Il tuo account è ora completo.</p>
            <Link to="/home" className="inline-block px-6 py-3 bg-sage-500 text-white rounded-2xl font-semibold text-sm hover:bg-sage-600">
              Vai all'app
            </Link>
          </>
        )}

        {state === 'error' && (
          <>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Verifica fallita</h1>
            <p className="text-sm text-red-600 mb-6">{errorMsg}</p>
            <Link to="/home" className="inline-block px-6 py-3 bg-sage-500 text-white rounded-2xl font-semibold text-sm hover:bg-sage-600">
              Torna all'app
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
