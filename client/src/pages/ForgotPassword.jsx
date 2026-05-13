import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.auth.forgotPassword(email);
      setSubmitted(true);
    } catch (err) {
      setError(err.message || 'Errore. Riprova tra qualche minuto.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mobile-container bg-white px-6 py-12 animate-fade-in">
      <div className="flex-1 flex flex-col justify-center max-w-mobile w-full mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Password dimenticata?</h1>
          <p className="mt-2 text-gray-500 text-sm">Inseriremo il link di reset via email.</p>
        </div>

        {submitted ? (
          <div className="bg-sage-50 border border-sage-200 rounded-xl px-4 py-4 text-sm text-sage-800">
            Se questa email è registrata, riceverai le istruzioni per reimpostare la password.
            <div className="mt-4">
              <Link to="/login" className="text-sage-700 underline">← Torna al login</Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sage-400"
                placeholder="tu@esempio.it"
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
              {loading ? 'Invio…' : 'Invia link di reset'}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-gray-500">
          <Link to="/login" className="text-sage-600 font-medium hover:underline">← Torna al login</Link>
        </p>
      </div>
    </div>
  );
}
