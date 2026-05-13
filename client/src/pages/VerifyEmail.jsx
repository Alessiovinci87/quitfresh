import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [state, setState] = useState('loading'); // loading | success | error
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!token) {
      setState('error');
      setErrorMsg('Link non valido — token mancante.');
      return;
    }
    api.auth.verifyEmail(token)
      .then(() => setState('success'))
      .catch((err) => {
        setState('error');
        setErrorMsg(err.message || 'Token non valido o già usato.');
      });
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-6 py-12">
      <div className="max-w-mobile w-full text-center">
        {state === 'loading' && (
          <p className="text-sm text-gray-500">Verifica in corso…</p>
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
