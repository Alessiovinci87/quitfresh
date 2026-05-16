import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function CheckEmail() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [resendState, setResendState] = useState('idle'); // 'idle' | 'sending' | 'sent' | 'error'
  const [resendMsg, setResendMsg] = useState('');

  // Utenti che hanno già verificato non devono restare bloccati qui.
  if (user?.emailVerified) {
    navigate(user.quitDate ? '/home' : '/onboarding', { replace: true });
    return null;
  }

  async function handleResend() {
    setResendState('sending');
    setResendMsg('');
    try {
      const res = await api.auth.resendVerify();
      setResendState('sent');
      setResendMsg(res?.message || 'Email inviata di nuovo. Controlla la casella.');
    } catch (err) {
      setResendState('error');
      setResendMsg(err.message || 'Impossibile inviare il link. Riprova tra qualche istante.');
    }
  }

  function handleSwitchAccount() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="mobile-container bg-gradient-to-b from-cream-50 to-cream-100 px-6 py-12 animate-fade-in">
      <div className="max-w-mobile w-full mx-auto flex-1 flex flex-col justify-center">
        <div className="bg-white rounded-2xl-soft shadow-soft border border-sage-100/60 p-8 text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-sage-50 border border-sage-100 flex items-center justify-center mb-5">
            <svg className="w-8 h-8 text-sage-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>

          <h1 className="font-display text-2xl font-semibold text-sage-900 mb-2">
            Controlla la tua casella
          </h1>
          <p className="text-sm text-sage-700/80 leading-relaxed mb-1">
            Abbiamo inviato un link di conferma a
          </p>
          <p className="text-sm font-semibold text-sage-900 mb-5 break-all">
            {user?.email || 'la tua email'}
          </p>

          <p className="text-[13px] text-sage-600/80 leading-relaxed mb-6">
            Apri la mail, tocca il bottone <strong>Verifica l'email</strong>, poi
            torna qui o segui il link che ti invieremo subito dopo.
          </p>

          <div className="bg-sage-50 border border-sage-100 rounded-xl-soft px-4 py-3 mb-6 text-left">
            <p className="text-[12px] text-sage-700/80 leading-relaxed">
              <strong>Non vedi nulla?</strong> Controlla lo spam o le promozioni.
              Il mittente è <span className="font-mono text-[11px]">noreply@quitfresh.it</span>.
            </p>
          </div>

          {resendMsg && (
            <p className={`text-[13px] mb-4 rounded-lg px-3 py-2 ${
              resendState === 'error'
                ? 'text-terracotta-700 bg-terracotta-100 border border-terracotta-200'
                : 'text-sage-700 bg-sage-50 border border-sage-100'
            }`}>
              {resendMsg}
            </p>
          )}

          <button
            onClick={handleResend}
            disabled={resendState === 'sending'}
            className="w-full py-3 bg-gradient-to-br from-sage-500 to-sage-700 text-white rounded-xl-soft font-semibold text-sm shadow-sage disabled:opacity-60 active:scale-[0.98] transition-all mb-3"
          >
            {resendState === 'sending' ? 'Invio in corso…' : 'Invia di nuovo il link'}
          </button>

          <button
            onClick={handleSwitchAccount}
            className="w-full py-2.5 text-xs text-sage-600/70 hover:text-sage-700 transition-colors"
          >
            Usa un altro indirizzo
          </button>
        </div>
      </div>
    </div>
  );
}
