import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => navigate('/login', { replace: true }), 2500);
    return () => clearTimeout(t);
  }, [success, navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('La password deve avere almeno 8 caratteri');
      return;
    }
    if (password !== confirm) {
      setError('Le password non coincidono');
      return;
    }

    setLoading(true);
    try {
      await api.auth.resetPassword(token, password);
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Errore durante il reset.');
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="mobile-container bg-white px-6 py-12">
        <div className="max-w-mobile w-full mx-auto text-center">
          <p className="text-sm text-red-600 mb-4">Link non valido — token mancante.</p>
          <Link to="/login" className="text-sage-600 underline text-sm">Torna al login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mobile-container bg-white px-6 py-12 animate-fade-in">
      <div className="flex-1 flex flex-col justify-center max-w-mobile w-full mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Nuova password</h1>
          <p className="mt-2 text-gray-500 text-sm">Scegli una password di almeno 8 caratteri.</p>
        </div>

        {success ? (
          <div className="bg-sage-50 border border-sage-200 rounded-xl px-4 py-4 text-sm text-sage-800">
            Password aggiornata. Ti reindirizzo al login…
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nuova password</label>
              <input
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sage-400"
                placeholder="Almeno 8 caratteri"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Conferma password</label>
              <input
                type="password"
                autoComplete="new-password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sage-400"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-sage-500 text-white rounded-xl font-semibold text-sm hover:bg-sage-600 disabled:opacity-60 transition-colors"
            >
              {loading ? 'Aggiornamento…' : 'Aggiorna password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
