import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { track } from '../lib/tracker';

export default function Register() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', confirm: '', accepted: false });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) {
    if (!user.emailVerified) navigate('/check-email', { replace: true });
    else if (!user.quitDate) navigate('/onboarding', { replace: true });
    else navigate('/home', { replace: true });
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirm) {
      setError('Le password non coincidono');
      return;
    }

    if (!form.accepted) {
      setError('Devi accettare la Privacy Policy e i Termini di Servizio per procedere.');
      return;
    }

    setLoading(true);
    try {
      const { token, user: userData } = await api.auth.register({
        email: form.email,
        password: form.password,
      });
      track('register_success');
      login(token, userData);
      navigate('/check-email', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mobile-container bg-white px-6 py-12 animate-fade-in">
      <div className="flex-1 flex flex-col justify-center max-w-mobile w-full mx-auto">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-gray-900">Inizia ora.</h1>
          <p className="mt-2 text-gray-500 text-sm">Crea il tuo account QuitFresh.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              autoComplete="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sage-400 focus:border-transparent transition"
              placeholder="tu@esempio.it"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sage-400 focus:border-transparent transition"
              placeholder="Almeno 8 caratteri"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Conferma password</label>
            <input
              type="password"
              autoComplete="new-password"
              required
              value={form.confirm}
              onChange={(e) => setForm({ ...form, confirm: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sage-400 focus:border-transparent transition"
              placeholder="••••••••"
            />
          </div>

          <label className="flex items-start gap-2.5 text-xs text-gray-600 leading-relaxed cursor-pointer select-none">
            <input
              type="checkbox"
              required
              checked={form.accepted}
              onChange={(e) => setForm({ ...form, accepted: e.target.checked })}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-sage-600 focus:ring-sage-400 cursor-pointer flex-shrink-0"
            />
            <span>
              Ho letto e accetto la{' '}
              <Link to="/privacy" target="_blank" rel="noopener" className="text-sage-600 underline">
                Privacy Policy
              </Link>{' '}
              e i{' '}
              <Link to="/terms" target="_blank" rel="noopener" className="text-sage-600 underline">
                Termini di Servizio
              </Link>
              . Acconsento espressamente al trattamento dei dati sanitari (numero
              di sigarette, protocollo citisina) ai sensi dell'art. 9.2.a GDPR.
            </span>
          </label>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-sage-500 text-white rounded-xl font-semibold text-sm hover:bg-sage-600 active:bg-sage-700 disabled:opacity-60 transition-colors"
          >
            {loading ? 'Creazione account…' : 'Crea account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Hai già un account?{' '}
          <Link to="/login" className="text-sage-600 font-medium hover:underline">
            Accedi
          </Link>
        </p>
      </div>
    </div>
  );
}
